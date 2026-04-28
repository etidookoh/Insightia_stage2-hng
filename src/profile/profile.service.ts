import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Profile } from './entities/profile.entity';
import { QueryProfileDto } from './dto/query-profile.dto';
import { parseNaturalQuery } from './nlp/query-parser';
import { Request } from 'express';

export interface PaginatedResult {
  status: string;
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  links: {
    self: string;
    next: string | null;
    prev: string | null;
  };
  data: Profile[];
}

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(Profile)
    private readonly profileRepo: Repository<Profile>,
  ) {}

  async findAll(query: QueryProfileDto, req: Request): Promise<PaginatedResult> {
    const {
      gender,
      age_group,
      country_id,
      min_age,
      max_age,
      min_gender_probability,
      min_country_probability,
      sort_by = 'created_at',
      order = 'asc',
      page = 1,
      limit = 10,
    } = query;

    const qb = this.profileRepo.createQueryBuilder('profile');

    this.applyFilters(qb, {
      gender, age_group, country_id, min_age, max_age,
      min_gender_probability, min_country_probability,
    });

    const sortColumn = `profile.${sort_by}`;
    qb.orderBy(sortColumn, order.toUpperCase() as 'ASC' | 'DESC');

    const take = Math.min(limit, 50);
    const skip = (page - 1) * take;
    qb.skip(skip).take(take);

    const [data, total] = await qb.getManyAndCount();
    const total_pages = Math.ceil(total / take);
    const baseUrl = `/api/profiles`;
    const queryString = this.buildQueryString(query, take);

    return {
      status: 'success',
      page,
      limit: take,
      total,
      total_pages,
      links: {
        self: `${baseUrl}?page=${page}&limit=${take}${queryString}`,
        next: page < total_pages ? `${baseUrl}?page=${page + 1}&limit=${take}${queryString}` : null,
        prev: page > 1 ? `${baseUrl}?page=${page - 1}&limit=${take}${queryString}` : null,
      },
      data,
    };
  }

  async search(q: string, page: number = 1, limit: number = 10, req: Request): Promise<PaginatedResult> {
    if (!q || !q.trim()) {
      throw new BadRequestException('Unable to interpret query');
    }

    const parsed = parseNaturalQuery(q);
    if (!parsed) {
      throw new BadRequestException('Unable to interpret query');
    }

    const qb = this.profileRepo.createQueryBuilder('profile');
    this.applyFilters(qb, {
      gender: parsed.gender,
      age_group: parsed.age_group,
      country_id: parsed.country_id,
      min_age: parsed.min_age,
      max_age: parsed.max_age,
    });

    qb.orderBy('profile.created_at', 'ASC');

    const take = Math.min(limit, 50);
    const skip = (page - 1) * take;
    qb.skip(skip).take(take);

    const [data, total] = await qb.getManyAndCount();
    const total_pages = Math.ceil(total / take);
    const baseUrl = `/api/profiles/search`;

    return {
      status: 'success',
      page,
      limit: take,
      total,
      total_pages,
      links: {
        self: `${baseUrl}?q=${encodeURIComponent(q)}&page=${page}&limit=${take}`,
        next: page < total_pages ? `${baseUrl}?q=${encodeURIComponent(q)}&page=${page + 1}&limit=${take}` : null,
        prev: page > 1 ? `${baseUrl}?q=${encodeURIComponent(q)}&page=${page - 1}&limit=${take}` : null,
      },
      data,
    };
  }

  async create(name: string): Promise<Profile> {
    const existing = await this.profileRepo.findOne({ where: { name } });
    if (existing) return existing;

    const [genderRes, nationalityRes] = await Promise.all([
      fetch(`https://api.genderize.io/?name=${encodeURIComponent(name)}`).then(r => r.json()),
      fetch(`https://api.nationalize.io/?name=${encodeURIComponent(name)}`).then(r => r.json()),
    ]);

    const ageRes = await fetch(`https://api.agify.io/?name=${encodeURIComponent(name)}`).then(r => r.json());

    const topCountry = nationalityRes.country?.[0];
    let countryName = topCountry?.country_id ?? 'Unknown';

    try {
      const geoRes = await fetch(`https://restcountries.com/v3.1/alpha/${topCountry?.country_id}`).then(r => r.json());
      countryName = geoRes?.[0]?.name?.common ?? countryName;
    } catch {}

    const age = ageRes.age ?? 0;
    const age_group = age < 18 ? 'child' : age < 35 ? 'young adult' : age < 60 ? 'adult' : 'senior';

    const profile = this.profileRepo.create({
      name,
      gender: genderRes.gender ?? 'unknown',
      gender_probability: genderRes.probability ?? 0,
      age,
      age_group,
      country_id: topCountry?.country_id ?? 'XX',
      country_name: countryName,
      country_probability: topCountry?.probability ?? 0,
    });

    return this.profileRepo.save(profile);
  }

  async exportCsv(query: QueryProfileDto): Promise<Profile[]> {
    const qb = this.profileRepo.createQueryBuilder('profile');
    this.applyFilters(qb, query);
    const sort_by = query.sort_by ?? 'created_at';
    const order = query.order ?? 'asc';
    qb.orderBy(`profile.${sort_by}`, order.toUpperCase() as 'ASC' | 'DESC');
    return qb.getMany();
  }

  private buildQueryString(query: QueryProfileDto, limit: number): string {
    const parts: string[] = [];
    if (query.gender) parts.push(`gender=${query.gender}`);
    if (query.age_group) parts.push(`age_group=${query.age_group}`);
    if (query.country_id) parts.push(`country_id=${query.country_id}`);
    if (query.min_age !== undefined) parts.push(`min_age=${query.min_age}`);
    if (query.max_age !== undefined) parts.push(`max_age=${query.max_age}`);
    if (query.sort_by) parts.push(`sort_by=${query.sort_by}`);
    if (query.order) parts.push(`order=${query.order}`);
    return parts.length ? `&${parts.join('&')}` : '';
  }

  private applyFilters(
    qb: SelectQueryBuilder<Profile>,
    filters: {
      gender?: string;
      age_group?: string;
      country_id?: string;
      min_age?: number;
      max_age?: number;
      min_gender_probability?: number;
      min_country_probability?: number;
    },
  ): void {
    const { gender, age_group, country_id, min_age, max_age, min_gender_probability, min_country_probability } = filters;
    if (gender) qb.andWhere('profile.gender = :gender', { gender });
    if (age_group) qb.andWhere('profile.age_group = :age_group', { age_group });
    if (country_id) qb.andWhere('UPPER(profile.country_id) = UPPER(:country_id)', { country_id });
    if (min_age !== undefined) qb.andWhere('profile.age >= :min_age', { min_age });
    if (max_age !== undefined) qb.andWhere('profile.age <= :max_age', { max_age });
    if (min_gender_probability !== undefined) qb.andWhere('profile.gender_probability >= :min_gender_probability', { min_gender_probability });
    if (min_country_probability !== undefined) qb.andWhere('profile.country_probability >= :min_country_probability', { min_country_probability });
  }
}