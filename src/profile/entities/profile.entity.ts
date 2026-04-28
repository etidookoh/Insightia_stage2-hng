import {Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index,} from 'typeorm';

@Entity('profiles')
export class Profile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', unique: true })
  name: string;

  @Column({ type: 'varchar' })
  gender: string;

  @Column({ type: 'float' })
  gender_probability: number;

  @Column({ type: 'int' })
  age: number;

  @Column({ type: 'varchar' })
  age_group: string;

  @Column({ type: 'varchar', length: 2 })
  country_id: string;

  @Column({ type: 'varchar' })
  country_name: string;

  @Column({ type: 'float' })
  country_probability: number;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;
}