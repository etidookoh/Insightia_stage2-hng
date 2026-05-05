import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Profile } from './entities/profile.entity';
import { ProfileService } from './profile.service';
import { ProfileController } from './profile.controller';
import { CsvIngestionService } from './csv-ingestion.service';

@Module({
  imports: [TypeOrmModule.forFeature([Profile])],
  providers: [ProfileService, CsvIngestionService],
  controllers: [ProfileController],
})
export class ProfileModule {}