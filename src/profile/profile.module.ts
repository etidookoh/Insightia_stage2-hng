// import { Module } from '@nestjs/common';
// import { ProfileService } from './profile.service';
// import { ProfileController } from './profile.controller';

// @Module({
//   controllers: [ProfileController],
//   providers: [ProfileService],
// })
// export class ProfileModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Profile } from './entities/profile.entity';
import { ProfileService } from './profile.service';
import { ProfileController } from './profile.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Profile])],
  providers: [ProfileService],
  controllers: [ProfileController],
})
export class ProfileModule {}