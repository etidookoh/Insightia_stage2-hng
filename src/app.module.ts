// import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
// import { ConfigModule, ConfigService } from '@nestjs/config';
// import { TypeOrmModule } from '@nestjs/typeorm';
// import { ProfileModule } from './profile/profile.module';
// import { Profile } from './profile/entities/profile.entity';
// import { UsersModule } from './users/users.module';
// import { RefreshToken } from './users/entities/refresh-token.entity';
// import { User } from './users/entities/user.entity';
// import { AuthModule } from './auth/auth.module';
// import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
// import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
// import { RolesGuard } from './auth/guards/roles.guard';
// import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
// import { ApiVersionMiddleware } from './common/middleware/api-version.middleware';
// import { ThrottlerModule } from '@nestjs/throttler';
// import { CustomThrottlerGuard } from './common/guards/custom-throttler.guard';

// @Module({
//   imports: [
//     ThrottlerModule.forRoot([
//   {
//     name: 'auth',
//     ttl: 60000,
//     limit: 10,
//   },
//   {
//     name: 'global',
//     ttl: 60000,
//     limit: 60,
//   },
// ]),
//     ConfigModule.forRoot({ isGlobal: true }),
//     TypeOrmModule.forRootAsync({
//       imports: [ConfigModule],
//       inject: [ConfigService],
//       useFactory: (config: ConfigService) => {
//         const databaseUrl = config.get<string>('DATABASE_URL');
//         if (databaseUrl) {
//           return {
//             type: 'postgres' as const,
//             url: databaseUrl,
//             entities: [Profile, User, RefreshToken],
//             synchronize: true,
//             logging: false,
//             ssl: { rejectUnauthorized: false },
//           };
//         }
//         return {
//           type: 'postgres' as const,
//           host: config.get<string>('DB_HOST', 'localhost'),
//           port: config.get<number>('DB_PORT', 5432),
//           username: config.get<string>('DB_USERNAME', 'postgres'),
//           password: config.get<string>('DB_PASSWORD', ''),
//           database: config.get<string>('DB_NAME', 'hng-stage-2'),
//           entities: [Profile, User, RefreshToken],
//           synchronize: true,
//           logging: false,
//         };
//       },
//     }),
//     AuthModule,
//     ProfileModule,
//     UsersModule,
//   ],
//   providers: [
//     {provide: APP_GUARD, useClass: JwtAuthGuard},
//     {provide: APP_GUARD, useClass: RolesGuard},
//     {provide: APP_GUARD, useClass: CustomThrottlerGuard},
//     {provide: APP_INTERCEPTOR, useClass: LoggingInterceptor},
//   ],
// })
// export class AppModule implements NestModule{
//   configure(consumer: MiddlewareConsumer){
//     consumer
//     .apply(ApiVersionMiddleware)
//     .forRoutes({path: 'api/*', method: RequestMethod.ALL});
//   }
// }

import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
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
      { name: 'auth', ttl: 60000, limit: 10 },
      { name: 'global', ttl: 60000, limit: 60 },
    ]),

    // Global in-memory cache — no Redis needed.
    // TTL and max item count set here as defaults; individual cache.set()
    // calls in ProfileService override TTL where needed.
    CacheModule.register({
      isGlobal: true,
      ttl: 90_000,  // 90 seconds default
      max: 500,     // max 500 entries before LRU eviction
    }),

    ConfigModule.forRoot({ isGlobal: true }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const databaseUrl = config.get<string>('DATABASE_URL');
        const base = {
          type: 'postgres' as const,
          entities: [Profile, User, RefreshToken],
          synchronize: true,
          logging: false,
          // Connection pool settings.
          // extra.max: number of connections in the pool.
          // Remote DB incurs latency per connection acquisition;
          // a pool of 10 amortises this across concurrent queries.
          extra: {
            max: 10,             // max pool connections
            min: 2,              // keep 2 warm at all times
            idleTimeoutMillis: 30_000,
            connectionTimeoutMillis: 5_000,
          },
        };

        if (databaseUrl) {
          return {
            ...base,
            url: databaseUrl,
            ssl: { rejectUnauthorized: false },
          };
        }

        return {
          ...base,
          host: config.get<string>('DB_HOST', 'localhost'),
          port: config.get<number>('DB_PORT', 5432),
          username: config.get<string>('DB_USERNAME', 'postgres'),
          password: config.get<string>('DB_PASSWORD', ''),
          database: config.get<string>('DB_NAME', 'hng-stage-2'),
        };
      },
    }),

    AuthModule,
    ProfileModule,
    UsersModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: CustomThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(ApiVersionMiddleware)
      .forRoutes({ path: 'api/*', method: RequestMethod.ALL });
  }
}