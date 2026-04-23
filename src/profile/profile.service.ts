// import { Injectable } from '@nestjs/common';

// @Injectable()
// export class ProfileService {}


import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Profile } from './entities/profile.entity';
import { QueryProfileDto } from './dto/query-profile.dto';
import { parseNaturalQuery } from './nlp/query-parser';

export interface PaginatedResult {
  status: string;
  page: number;
  limit: number;
  total: number;
  data: Profile[];
}

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(Profile)
    private readonly profileRepo: Repository<Profile>,
  ) {}

  async findAll(query: QueryProfileDto): Promise<PaginatedResult> {
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
      gender,
      age_group,
      country_id,
      min_age,
      max_age,
      min_gender_probability,
      min_country_probability,
    });

    // Sorting
    const sortColumn = `profile.${sort_by}`;
    qb.orderBy(sortColumn, order.toUpperCase() as 'ASC' | 'DESC');

    // Pagination
    const take = Math.min(limit, 50);
    const skip = (page - 1) * take;
    qb.skip(skip).take(take);

    const [data, total] = await qb.getManyAndCount();

    return {
      status: 'success',
      page,
      limit: take,
      total,
      data,
    };
  }

  async search(
    q: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedResult> {
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

    return {
      status: 'success',
      page,
      limit: take,
      total,
      data,
    };
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
    const {
      gender,
      age_group,
      country_id,
      min_age,
      max_age,
      min_gender_probability,
      min_country_probability,
    } = filters;

    if (gender) {
      qb.andWhere('profile.gender = :gender', { gender });
    }

    if (age_group) {
      qb.andWhere('profile.age_group = :age_group', { age_group });
    }

    if (country_id) {
      qb.andWhere('UPPER(profile.country_id) = UPPER(:country_id)', {
        country_id,
      });
    }

    if (min_age !== undefined) {
      qb.andWhere('profile.age >= :min_age', { min_age });
    }

    if (max_age !== undefined) {
      qb.andWhere('profile.age <= :max_age', { max_age });
    }

    if (min_gender_probability !== undefined) {
      qb.andWhere('profile.gender_probability >= :min_gender_probability', {
        min_gender_probability,
      });
    }

    if (min_country_probability !== undefined) {
      qb.andWhere('profile.country_probability >= :min_country_probability', {
        min_country_probability,
      });
    }
  }
}