import { IsOptional, IsString, IsNumber, IsIn, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryProfileDto {
  @IsOptional()
  @IsIn(['male', 'female'], { message: 'gender must be male or female' })
  gender?: string;

  @IsOptional()
  @IsIn(['child', 'teenager', 'adult', 'senior'], {
    message: 'age_group must be child, teenager, adult, or senior',
  })
  age_group?: string;

  @IsOptional()
  @IsString()
  country_id?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  min_age?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  max_age?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  min_gender_probability?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  min_country_probability?: number;

  @IsOptional()
  @IsIn(['age', 'created_at', 'gender_probability'], {
    message: 'sort_by must be age, created_at, or gender_probability',
  })
  sort_by?: string;

  @IsOptional()
  @IsIn(['asc', 'desc'], { message: 'order must be asc or desc' })
  order?: 'asc' | 'desc';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number;
}