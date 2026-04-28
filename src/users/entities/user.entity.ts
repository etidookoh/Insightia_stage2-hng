import {Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany} from 'typeorm';
import { RefreshToken } from './refresh-token.entity';

export enum UserRole {
  ADMIN = 'admin',
  ANALYST = 'analyst',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  github_id: string;

  @Column({ type: 'varchar' })
  username: string;

  @Column({ type: 'varchar', nullable: true })
  email: string;

  @Column({ type: 'varchar', nullable: true })
  avatar_url: string;

  @Column({ type: 'varchar', default: UserRole.ANALYST })
  role: UserRole;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'timestamp with time zone', nullable: true })
  last_login_at: Date;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;

  @OneToMany(() => RefreshToken, (token) => token.user)
  refresh_tokens: RefreshToken[];
}