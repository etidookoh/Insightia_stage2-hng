import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { randomBytes } from 'crypto';
import type { StringValue } from 'ms';

interface PkceEntry {
  codeVerifier: string;
  cliRedirect?: string;
  expiresAt: number;
}

@Injectable()
export class AuthService {
  private pkceStore = new Map<string, PkceEntry>();

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  storePkce(state: string, codeVerifier: string, cliRedirect?: string): void {
    this.pkceStore.set(state, {
      codeVerifier,
      cliRedirect,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });
  }

  getPkce(state: string): { codeVerifier: string; cliRedirect?: string } | null {
    const entry = this.pkceStore.get(state);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.pkceStore.delete(state);
      return null;
    }
    this.pkceStore.delete(state);
    return entry;
  }

  async generateTokens(user: User): Promise<{ access_token: string; refresh_token: string }> {
    const payload = { sub: user.id, username: user.username, role: user.role };

    const access_token = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '3m') as StringValue,
    });

    const refresh_token = randomBytes(40).toString('hex');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await this.usersService.saveRefreshToken(user.id, refresh_token, expiresAt);

    return { access_token, refresh_token };
  }

  async refresh(token: string): Promise<{ access_token: string; refresh_token: string }> {
    const stored = await this.usersService.findRefreshToken(token);

    if (!stored || stored.is_revoked) {
      throw new UnauthorizedException({
        status: 'error',
        message: 'Invalid refresh token',
      });
    }

    if (new Date() > stored.expires_at) {
      throw new UnauthorizedException({
        status: 'error',
        message: 'Refresh token expired',
      });
    }

    await this.usersService.revokeRefreshToken(token);
    await this.usersService.assertActive(stored.user);

    return this.generateTokens(stored.user);
  }

  async logout(token: string): Promise<void> {
    if (!token) {
      throw new BadRequestException({
        status: 'error',
        message: 'Refresh token required',
      });
    }
    await this.usersService.revokeRefreshToken(token);
  }
}