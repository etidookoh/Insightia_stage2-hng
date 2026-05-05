// import {Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index,} from 'typeorm';

// @Entity('profiles')

// @Index('idx_gender_country', ['gender', 'country_id'])
// @Index('idx_country_age', ['country_id', 'age'])
// @Index('idx_gender_age', ['gender', 'age'])
// @Index('idx_gender_country_age', ['gender', 'country_id', 'age'])

// export class Profile {
//   @PrimaryGeneratedColumn('uuid')
//   id: string;

//   @Index({ unique: true })
//   @Column({ type: 'varchar', unique: true })
//   name: string;

//   @Column({ type: 'varchar' })
//   gender: string;

//   @Column({ type: 'float' })
//   gender_probability: number;

//   @Column({ type: 'int' })
//   age: number;

//   @Column({ type: 'varchar' })
//   age_group: string;

//   @Column({ type: 'varchar', length: 2 })
//   country_id: string;

//   @Column({ type: 'varchar' })
//   country_name: string;

//   @Column({ type: 'float' })
//   country_probability: number;

//   @CreateDateColumn({ type: 'timestamp with time zone' })
//   created_at: Date;
// }

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index,} from 'typeorm';

@Entity('profiles')
// Composite indexes covering the most common filter combinations.
// These turn full-table scans into index seeks on a 1M+ row table.
@Index('idx_gender_country', ['gender', 'country_id'])
@Index('idx_country_age', ['country_id', 'age'])
@Index('idx_gender_age', ['gender', 'age'])
@Index('idx_gender_country_age', ['gender', 'country_id', 'age'])
export class Profile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', unique: true })
  name: string;

  @Index('idx_gender')
  @Column({ type: 'varchar' })
  gender: string;

  @Column({ type: 'float' })
  gender_probability: number;

  @Index('idx_age')
  @Column({ type: 'int' })
  age: number;

  @Column({ type: 'varchar' })
  age_group: string;

  @Index('idx_country_id')
  @Column({ type: 'varchar', length: 2 })
  country_id: string;

  @Column({ type: 'varchar' })
  country_name: string;

  @Column({ type: 'float' })
  country_probability: number;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;
}