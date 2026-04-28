import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';
import { UsersService } from '../../users/users.service';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      clientID: configService.get<string>('GITHUB_CLIENT_ID')!,
      clientSecret: configService.get<string>('GITHUB_CLIENT_SECRET')!,
      callbackURL: configService.get<string>('GITHUB_CALLBACK_URL')!,
      scope: ['user:email'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: any,
  ): Promise<any> {
    const email = profile.emails?.[0]?.value ?? null;
    return this.usersService.findOrCreate({
      github_id: profile.id,
      username: profile.username,
      email,
      avatar_url: profile.photos?.[0]?.value ?? null,
    });
  }
}