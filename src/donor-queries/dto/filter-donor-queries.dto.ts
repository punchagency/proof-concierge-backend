import { IsOptional, IsString, IsEnum, IsDateString } from 'class-validator';
import { QueryMode, QueryStatus } from '@prisma/client';
import { Transform } from 'class-transformer';

export class FilterDonorQueriesDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value === '' ? undefined : value)
  test?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value === '' ? undefined : value)
  stage?: string;

  @IsOptional()
  @IsEnum(QueryMode)
  @Transform(({ value }) => value === '' ? undefined : value)
  queryMode?: QueryMode;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value === '' ? undefined : value)
  device?: string;

  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => value === '' ? undefined : value)
  date?: string;

  @IsOptional()
  @IsEnum(QueryStatus)
  @Transform(({ value }) => value === '' ? undefined : value)
  status?: QueryStatus;
} 