import { Injectable, NestMiddleware, BadRequestException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class ApiVersionMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    const version = req.headers['x-api-version'];
    if (!version) {
      throw new BadRequestException({
        status: 'error',
        message: 'API version header required',
      });
    }
    next();
  }
}