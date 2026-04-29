// import { Controller, Get, Post, Body, Req, Res, UseGuards } from '@nestjs/common';
// import { AuthGuard } from '@nestjs/passport';
// import { AuthService } from './auth.service';
// import { Public } from './decorators/public.decorator';
// import { CurrentUser } from './decorators/current-user.decorator';
// import { User } from '../users/entities/user.entity';
// import { ConfigService } from '@nestjs/config';
// import type { Response, Request } from 'express';

// @Controller('auth')
// export class AuthController {
//   constructor(
//     private readonly authService: AuthService,
//     private readonly configService: ConfigService,
//   ) {}

//   @Public()
// @Get('github')
// async githubLogin(@Req() req: Request, @Res() res: Response) {
//   const cliRedirect = (req.query as any).cli_redirect;
//   const state = require('crypto').randomBytes(16).toString('hex');
//   const codeVerifier = require('crypto').randomBytes(32).toString('base64url');
//   const codeChallenge = require('crypto')
//     .createHash('sha256')
//     .update(codeVerifier)
//     .digest('base64url');

//   if (cliRedirect) {
//     res.cookie('cli_redirect', cliRedirect, {
//       httpOnly: true,
//       maxAge: 5 * 60 * 1000,
//       sameSite: 'lax',
//     });
//   }

//   res.cookie('oauth_state', state, { httpOnly: true, maxAge: 5 * 60 * 1000, sameSite: 'lax' });
//   res.cookie('code_verifier', codeVerifier, { httpOnly: true, maxAge: 5 * 60 * 1000, sameSite: 'lax' });

//   const clientID = this.configService.get<string>('GITHUB_CLIENT_ID')!;
//   const callbackURL = this.configService.get<string>('GITHUB_CALLBACK_URL')!;

//   const githubUrl = `https://github.com/login/oauth/authorize?client_id=${clientID}&redirect_uri=${encodeURIComponent(callbackURL)}&scope=user:email&state=${state}&code_challenge=${codeChallenge}&code_challenge_method=S256`;
//   return res.redirect(githubUrl);
// }

//   @Public()
// @Get('github/callback')
// @UseGuards(AuthGuard('github'))
// async githubCallback(
//   @CurrentUser() user: User,
//   @Req() req: Request,
//   @Res() res: Response,
// ) {
//   const returnedState = (req.query as any).state;
//   const storedState = (req.cookies as any)?.oauth_state;

//   if (!returnedState || !storedState || returnedState !== storedState) {
//     return res.status(400).json({ status: 'error', message: 'Invalid state parameter' });
//   }

//   const tokens = await this.authService.generateTokens(user);
//   const cliRedirect = (req.cookies as any)?.cli_redirect;

//   res.clearCookie('oauth_state');
//   res.clearCookie('code_verifier');

//   if (cliRedirect) {
//     res.clearCookie('cli_redirect');
//     return res.redirect(
//       `${cliRedirect}?access_token=${tokens.access_token}&refresh_token=${tokens.refresh_token}`,
//     );
//   }

//   const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3001');
//   return res.redirect(
//     `${frontendUrl}/auth/callback?access_token=${tokens.access_token}&refresh_token=${tokens.refresh_token}`,
//   );
// }

//   @Public()
//   @Post('refresh')
//   async refresh(@Body('refresh_token') refreshToken: string) {
//     const tokens = await this.authService.refresh(refreshToken);
//     return { status: 'success', ...tokens };
//   }

//   @Post('logout')
//   async logout(@Body('refresh_token') refreshToken: string) {
//     await this.authService.logout(refreshToken);
//     return { status: 'success', message: 'Logged out' };
//   }

//   @Get('me')
//   me(@CurrentUser() user: User) {
//     return {
//       status: 'success',
//       data: {
//         id: user.id,
//         username: user.username,
//         email: user.email,
//         avatar_url: user.avatar_url,
//         role: user.role,
//       },
//     };
//   }
// }

import { Controller, Get, Post, Body, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { ConfigService } from '@nestjs/config';
import { randomBytes, createHash } from 'crypto';
import type { Response, Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
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

    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';

    if (cliRedirect) {
      res.cookie('cli_redirect', cliRedirect, {
        httpOnly: true,
        maxAge: 5 * 60 * 1000,
        sameSite: 'lax',
        secure: isProduction,
      });
    }

    res.cookie('oauth_state', state, {
      httpOnly: true,
      maxAge: 5 * 60 * 1000,
      sameSite: 'lax',
      secure: isProduction,
    });

    res.cookie('code_verifier', codeVerifier, {
      httpOnly: true,
      maxAge: 5 * 60 * 1000,
      sameSite: 'lax',
      secure: isProduction,
    });

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
  @UseGuards(AuthGuard('github'))
  async githubCallback(
    @CurrentUser() user: User,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const returnedState = (req.query as any).state;
    const storedState = (req.cookies as any)?.oauth_state;

    if (storedState && returnedState !== storedState) {
      return res.status(400).json({ status: 'error', message: 'Invalid state parameter' });
    }

    const tokens = await this.authService.generateTokens(user);
    const cliRedirect = (req.cookies as any)?.cli_redirect;

    res.clearCookie('oauth_state');
    res.clearCookie('code_verifier');

    if (cliRedirect) {
      res.clearCookie('cli_redirect');
      return res.redirect(
        `${cliRedirect}?access_token=${tokens.access_token}&refresh_token=${tokens.refresh_token}`,
      );
    }

    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3001');
    return res.redirect(
      `${frontendUrl}/auth/callback?access_token=${tokens.access_token}&refresh_token=${tokens.refresh_token}`,
    );
  }

  @Public()
  @Post('refresh')
  async refresh(@Body('refresh_token') refreshToken: string) {
    if (!refreshToken) {
      return { status: 'error', message: 'refresh_token is required' };
    }
    const tokens = await this.authService.refresh(refreshToken);
    return { status: 'success', ...tokens };
  }

  @Post('logout')
  async logout(@Body('refresh_token') refreshToken: string) {
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
}