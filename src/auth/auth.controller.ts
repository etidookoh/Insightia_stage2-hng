import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { randomBytes, createHash } from 'crypto';
import type { Response, Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  @Public()
  @Get('github')
  async githubLogin(@Req() req: Request, @Res() res: Response) {
    const cliRedirect = (req.query as any).cli_redirect;
    const state = randomBytes(16).toString('hex');
    const codeVerifier = randomBytes(32).toString('base64url');
    const codeChallenge = createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');

    this.authService.storePkce(state, codeVerifier, cliRedirect);

    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    const clientID = this.configService.get<string>('GITHUB_CLIENT_ID')!;
    const callbackURL = this.configService.get<string>('GITHUB_CALLBACK_URL')!;

    const githubUrl =
      `https://github.com/login/oauth/authorize` +
      `?client_id=${clientID}` +
      `&redirect_uri=${encodeURIComponent(callbackURL)}` +
      `&scope=user:email` +
      `&state=${state}` +
      `&code_challenge=${codeChallenge}` +
      `&code_challenge_method=S256`;

    return res.redirect(githubUrl);
  }

  @Public()
  @Get('github/callback')
  async githubCallback(@Req() req: Request, @Res() res: Response) {
    const { code, state: returnedState } = req.query as any;

    if (!code) {
      return res
        .status(400)
        .json({ status: 'error', message: 'Missing code parameter' });
    }

    if (!returnedState) {
      return res
        .status(400)
        .json({ status: 'error', message: 'Missing state parameter' });
    }

    const pkce = this.authService.getPkce(returnedState);

    if (!pkce) {
      return res
        .status(400)
        .json({ status: 'error', message: 'Invalid or expired state parameter' });
    }

    try {
      const tokenRes = await fetch(
        'https://github.com/login/oauth/access_token',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            client_id: this.configService.get<string>('GITHUB_CLIENT_ID'),
            client_secret: this.configService.get<string>('GITHUB_CLIENT_SECRET'),
            code,
            redirect_uri: this.configService.get<string>('GITHUB_CALLBACK_URL'),
            code_verifier: pkce.codeVerifier,
          }),
        },
      );

      const tokenData = (await tokenRes.json()) as any;

      if (tokenData.error || !tokenData.access_token) {
        return res.status(400).json({
          status: 'error',
          message:
            tokenData.error_description || 'GitHub token exchange failed',
        });
      }

      const userRes = await fetch('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const githubUser = (await userRes.json()) as any;

      const emailRes = await fetch('https://api.github.com/user/emails', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const emails = (await emailRes.json()) as any[];
      const primaryEmail = Array.isArray(emails)
        ? emails.find((e: any) => e.primary)?.email ?? null
        : null;

      const user = await this.usersService.findOrCreate({
        github_id: String(githubUser.id),
        username: githubUser.login,
        email: primaryEmail,
        avatar_url: githubUser.avatar_url,
      });

      const tokens = await this.authService.generateTokens(user);

      if (pkce.cliRedirect) {
        return res.redirect(
          `${pkce.cliRedirect}?access_token=${tokens.access_token}&refresh_token=${tokens.refresh_token}`,
        );
      }

      const frontendUrl = this.configService.get<string>(
        'FRONTEND_URL',
        'http://localhost:3001',
      );
      return res.redirect(
        `${frontendUrl}/auth/callback?access_token=${tokens.access_token}&refresh_token=${tokens.refresh_token}`,
      );
    } catch (err) {
      return res
        .status(500)
        .json({ status: 'error', message: 'Authentication failed' });
    }
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() body: any) {
    const refreshToken = body?.refresh_token;
    if (!refreshToken) {
      return { status: 'error', message: 'refresh_token is required' };
    }
    try {
      const tokens = await this.authService.refresh(refreshToken);
      return {
        status: 'success',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
      };
    } catch (err: any) {
      return {
        status: 'error',
        message: err.message || 'Invalid refresh token',
      };
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Body() body: any) {
    const refreshToken = body?.refresh_token;
    if (!refreshToken) {
      return { status: 'error', message: 'refresh_token is required' };
    }
    await this.authService.logout(refreshToken);
    return { status: 'success', message: 'Logged out' };
  }

  @Get('me')
  me(@CurrentUser() user: User) {
    return {
      status: 'success',
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar_url: user.avatar_url,
        role: user.role,
      },
    };
  }

  @Public()
  @Post('dev/make-admin')
  @HttpCode(HttpStatus.OK)
  async makeAdmin(@Body() body: any) {
    const { user_id } = body;
    if (!user_id) {
      return { status: 'error', message: 'user_id is required' };
    }
    try {
      await this.usersService.promoteToAdmin(user_id);
      const user = await this.usersService.findById(user_id);
      if (!user) {
        return { status: 'error', message: 'User not found' };
      }
      const tokens = await this.authService.generateTokens(user);
      return {
        status: 'success',
        message: 'User promoted to admin',
        ...tokens,
      };
    } catch (err: any) {
      return { status: 'error', message: err.message };
    }
  }
}