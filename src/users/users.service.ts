import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
  ) {}

  async findOrCreate(githubProfile: {
    github_id: string;
    username: string;
    email: string;
    avatar_url: string;
  }): Promise<User> {
    let user = await this.userRepo.findOne({
      where: { github_id: githubProfile.github_id },
    });

    if (!user) {
      user = this.userRepo.create({
        ...githubProfile,
        role: UserRole.ANALYST,
        is_active: true,
      });
    }

    user.last_login_at = new Date();
    return this.userRepo.save(user);
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { id } });
  }

  async assertActive(user: User): Promise<void> {
    if (!user.is_active) {
      throw new ForbiddenException({
        status: 'error',
        message: 'Account is deactivated',
      });
    }
  }

  async saveRefreshToken(
    userId: string,
    token: string,
    expiresAt: Date,
  ): Promise<void> {
    const refreshToken = this.refreshTokenRepo.create({
      token,
      user_id: userId,
      expires_at: expiresAt,
      is_revoked: false,
    });
    await this.refreshTokenRepo.save(refreshToken);
  }

  async findRefreshToken(token: string): Promise<RefreshToken | null> {
    return this.refreshTokenRepo.findOne({
      where: { token },
      relations: ['user'],
    });
  }

  async revokeRefreshToken(token: string): Promise<void> {
    await this.refreshTokenRepo.update({ token }, { is_revoked: true });
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.refreshTokenRepo.update(
      { user_id: userId },
      { is_revoked: true },
    );
  }

  async promoteToAdmin(userId: string): Promise<void> {
  await this.userRepo.update({ id: userId }, { role: UserRole.ADMIN });
}
}
