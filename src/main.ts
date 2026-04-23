// import { NestFactory } from '@nestjs/core';
// import { AppModule } from './app.module';

// async function bootstrap() {
//   const app = await NestFactory.create(AppModule);
//   await app.listen(process.env.PORT ?? 3000);
// }
// bootstrap();


import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (
        typeof exceptionResponse === 'object' &&
        'status' in (exceptionResponse as object) &&
        'message' in (exceptionResponse as object)
      ) {
        return response.status(status).json(exceptionResponse);
      }

      const message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as any).message || 'Invalid query parameters';

      return response.status(status).json({
        status: 'error',
        message: Array.isArray(message) ? message[0] : message,
      });
    }

    console.error(exception);
    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({ origin: '*' });
  app.useGlobalFilters(new AllExceptionsFilter());

  const port = process.env.PORT || 3007;
  await app.listen(port);
  console.log(`🚀 Insighta Engine running on http://localhost:${port}`);
}

bootstrap();