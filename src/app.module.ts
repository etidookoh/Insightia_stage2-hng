// import { Module } from '@nestjs/common';
// import { ProfileModule } from './profile/profile.module';

// @Module({
//   imports: [ProfileModule],
//   controllers: [],
//   providers: [],
// })
// export class AppModule {}

// import { Module } from '@nestjs/common';
// import { ConfigModule, ConfigService } from '@nestjs/config';
// import { TypeOrmModule } from '@nestjs/typeorm';
// import { ProfileModule } from './profile/profile.module';
// import { Profile } from './profile/entities/profile.entity';

// @Module({
//   imports: [
//     ConfigModule.forRoot({ isGlobal: true }),
//     TypeOrmModule.forRootAsync({
//       imports: [ConfigModule],
//       inject: [ConfigService],
//       useFactory: (config: ConfigService) => ({
//         type: 'postgres',
//         host: config.get<string>('DB_HOST', 'localhost'),
//         port: config.get<number>('DB_PORT', 5432),
//         username: config.get<string>('DB_USERNAME', 'postgres'),
//         password: config.get<string>('DB_PASSWORD', ''),
//         database: config.get<string>('DB_NAME', 'hng-stae-2'),
//         entities: [Profile],
//         synchronize: true,
//         logging: false,
//       }),
//     }),
//     ProfileModule,
//   ],
// })
// export class AppModule {}

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfileModule } from './profile/profile.module';
import { Profile } from './profile/entities/profile.entity';

@Module({
  imports: [
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
            entities: [Profile],
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
          entities: [Profile],
          synchronize: true,
          logging: false,
        };
      },
    }),
    ProfileModule,
  ],
})
export class AppModule {}