import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerOptions } from '@nestjs/throttler';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    return req.ip ?? req.socket?.remoteAddress ?? 'unknown';
  }

  protected selectThrottlers(context: ExecutionContext): Promise<ThrottlerOptions[]> {
    const req = context.switchToHttp().getRequest();
    const isAuthRoute = req.path?.startsWith('/auth');
    return Promise.resolve(
      isAuthRoute
        ? [{ name: 'auth', ttl: 60000, limit: 10 }]
        : [{ name: 'global', ttl: 60000, limit: 60 }],
    );
  }

  protected async shouldSkip(_context: ExecutionContext): Promise<boolean> {
    return false;
  }
}