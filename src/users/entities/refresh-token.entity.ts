import {Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index} from 'typeorm';
import { User } from './user.entity';

@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', unique: true })
  token: string;

  @Column({ type: 'boolean', default: false })
  is_revoked: boolean;

  @Column({ type: 'timestamp with time zone' })
  expires_at: Date;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @ManyToOne(() => User, (user) => user.refresh_tokens, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'uuid' })
  user_id: string;
}