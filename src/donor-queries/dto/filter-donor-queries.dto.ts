import { IsOptional, IsString, IsEnum, IsDateString } from 'class-validator';
import { QueryMode, QueryStatus } from '@prisma/client';

export class FilterDonorQueriesDto {
  @IsOptional()
  @IsString()
  test?: string;

  @IsOptional()
  @IsString()
  stage?: string;

  @IsOptional()
  @IsEnum(QueryMode)
  queryMode?: QueryMode;

  @IsOptional()
  @IsString()
  device?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsEnum(QueryStatus)
  status?: QueryStatus;
} 