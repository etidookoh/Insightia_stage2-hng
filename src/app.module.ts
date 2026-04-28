import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfileModule } from './profile/profile.module';
import { Profile } from './profile/entities/profile.entity';
import { UsersModule } from './users/users.module';
import { RefreshToken } from './users/entities/refresh-token.entity';
import { User } from './users/entities/user.entity';
import { AuthModule } from './auth/auth.module';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { ApiVersionMiddleware } from './common/middleware/api-version.middleware';
import { ThrottlerModule } from '@nestjs/throttler';
import { CustomThrottlerGuard } from './common/guards/custom-throttler.guard';

@Module({
  imports: [
    ThrottlerModule.forRoot([
  {
    name: 'auth',
    ttl: 60000,
    limit: 10,
  },
  {
    name: 'global',
    ttl: 60000,
    limit: 60,
  },
]),
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const databaseUrl = config.get<string>('DATABASE_URL');
        if (databaseUrl) {
          return {
            type: 'postgres' as const,
            url: databaseUrl,
            entities: [Profile, User, RefreshToken],
            synchronize: true,
            logging: false,
            ssl: { rejectUnauthorized: false },
          };
        }
        return {
          type: 'postgres' as const,
          host: config.get<string>('DB_HOST', 'localhost'),
          port: config.get<number>('DB_PORT', 5432),
          username: config.get<string>('DB_USERNAME', 'postgres'),
          password: config.get<string>('DB_PASSWORD', ''),
          database: config.get<string>('DB_NAME', 'hng-stage-2'),
          entities: [Profile, User, RefreshToken],
          synchronize: true,
          logging: false,
        };
      },
    }),
    AuthModule,
    ProfileModule,
    UsersModule,
  ],
  providers: [
    {provide: APP_GUARD, useClass: JwtAuthGuard},
    {provide: APP_GUARD, useClass: RolesGuard},
    {provide: APP_GUARD, useClass: CustomThrottlerGuard},
    {provide: APP_INTERCEPTOR, useClass: LoggingInterceptor},
  ],
})
export class AppModule implements NestModule{
  configure(consumer: MiddlewareConsumer){
    consumer
    .apply(ApiVersionMiddleware)
    .forRoutes({path: 'api/*', method: RequestMethod.ALL});
  }
}