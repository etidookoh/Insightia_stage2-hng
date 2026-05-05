import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Profile } from './entities/profile.entity';
import { parse } from 'csv-parse';
import { Readable } from 'stream';

export interface IngestionResult {
  status: string;
  total_rows: number;
  inserted: number;
  skipped: number;
  reasons: Record<string, number>;
}

const REQUIRED_FIELDS = ['name', 'gender', 'age', 'country_id', 'country_name'];
const VALID_GENDERS = ['male', 'female'];
const VALID_AGE_GROUPS = ['child', 'teenager', 'adult', 'senior'];
const CHUNK_SIZE = 500;

function getAgeGroup(age: number): string {
  if (age < 13) return 'child';
  if (age < 18) return 'teenager';
  if (age < 60) return 'adult';
  return 'senior';
}

@Injectable()
export class CsvIngestionService {
  private readonly logger = new Logger(CsvIngestionService.name);

  constructor(
    @InjectRepository(Profile)
    private readonly profileRepo: Repository<Profile>,
  ) {}

  async ingestCsvBuffer(buffer: Buffer): Promise<IngestionResult> {
    const result: IngestionResult = {
      status: 'success',
      total_rows: 0,
      inserted: 0,
      skipped: 0,
      reasons: {},
    };

    const skip = (reason: string) => {
      result.skipped++;
      result.reasons[reason] = (result.reasons[reason] ?? 0) + 1;
    };

    let chunk: Partial<Profile>[] = [];

    const flushChunk = async () => {
      if (chunk.length === 0) return;
      try {
        const insertResult = await this.profileRepo
          .createQueryBuilder()
          .insert()
          .into(Profile)
          .values(chunk)
          .orIgnore()
          .execute();

        const actuallyInserted = insertResult.identifiers.filter(
          (id) => id && Object.keys(id).length > 0,
        ).length;
        const ignored = chunk.length - actuallyInserted;
        result.inserted += actuallyInserted;
        result.skipped += ignored;
        result.reasons['duplicate_name'] =
          (result.reasons['duplicate_name'] ?? 0) + ignored;
      } catch (err) {
        this.logger.error(`Chunk insert failed: ${(err as Error).message}`);
        result.skipped += chunk.length;
        result.reasons['insert_error'] =
          (result.reasons['insert_error'] ?? 0) + chunk.length;
      }
      chunk = [];
    };

    await new Promise<void>((resolve, reject) => {
      const stream = Readable.from(buffer);

      const parser = parse({
        columns: true,          
        skip_empty_lines: true,
        trim: true,
        relax_column_count: false,
        encoding: 'utf8',
      });

      parser.on('readable', async () => {
        parser.pause();

        let record: Record<string, string> | null;
        while ((record = parser.read()) !== null) {
          result.total_rows++;

          const missingField = REQUIRED_FIELDS.find(
            (f) => !record![f] || record![f].trim() === '',
          );
          if (missingField) {
            skip('missing_fields');
            continue;
          }

          const name = record.name.trim();
          const gender = record.gender.toLowerCase().trim();
          const ageRaw = parseInt(record.age, 10);
          const country_id = record.country_id.toUpperCase().trim();
          const country_name = record.country_name.trim();

          if (!VALID_GENDERS.includes(gender)) {
            skip('invalid_gender');
            continue;
          }

          if (isNaN(ageRaw) || ageRaw < 0 || ageRaw > 150) {
            skip('invalid_age');
            continue;
          }

          if (!/^[A-Z]{2}$/.test(country_id)) {
            skip('invalid_country_id');
            continue;
          }

          const gender_probability = parseFloat(record.gender_probability ?? '0') || 0;
          const country_probability = parseFloat(record.country_probability ?? '0') || 0;
          const age_group = record.age_group?.trim()
            ? (VALID_AGE_GROUPS.includes(record.age_group.trim().toLowerCase())
                ? record.age_group.trim().toLowerCase()
                : getAgeGroup(ageRaw))
            : getAgeGroup(ageRaw);

          chunk.push({
            name,
            gender,
            gender_probability,
            age: ageRaw,
            age_group,
            country_id,
            country_name,
            country_probability,
          });

          if (chunk.length >= CHUNK_SIZE) {
            await flushChunk();
          }
        }

        parser.resume();
      });

      parser.on('error', (err) => {
        this.logger.warn(`CSV parse error: ${err.message}`);
        result.skipped++;
        result.reasons['malformed_row'] =
          (result.reasons['malformed_row'] ?? 0) + 1;
        resolve();
      });

      parser.on('end', async () => {
        await flushChunk(); 
        resolve();
      });

      stream.pipe(parser);
    });

    return result;
  }
}