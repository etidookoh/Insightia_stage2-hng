import { DataSource } from 'typeorm';
import { Profile } from '../entities/profile.entity';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [Profile],
  synchronize: true,
  logging: false,
  ssl: false,
});

async function seed() {
  console.log('🌱 Connecting to database...');
  await AppDataSource.initialize();

  const repo = AppDataSource.getRepository(Profile);

  const seedPath = path.join(__dirname, '..', '..','..', 'seed_profiles.json');
  const raw = fs.readFileSync(seedPath, 'utf-8');
  const { profiles } = JSON.parse(raw) as {
    profiles: Array<{
      name: string;
      gender: string;
      gender_probability: number;
      age: number;
      age_group: string;
      country_id: string;
      country_name: string;
      country_probability: number;
    }>;
  };

  console.log(`📦 Loaded ${profiles.length} profiles from seed file`);

  let inserted = 0;
  let skipped = 0;

  const batchSize = 100;
  for (let i = 0; i < profiles.length; i += batchSize) {
    const batch = profiles.slice(i, i + batchSize);
    const result = await AppDataSource.createQueryBuilder()
      .insert()
      .into(Profile)
      .values(batch)
      .orIgnore() 
      .execute();
    inserted += result.raw?.length ?? 0;
    skipped += batch.length - (result.raw?.length ?? 0);
  }

  const total = await repo.count();
  console.log(`✅ Seeding complete. Total profiles in DB: ${total}`);

  await AppDataSource.destroy();
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});