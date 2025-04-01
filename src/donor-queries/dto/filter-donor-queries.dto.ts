import { IsEnum, IsOptional, IsString } from 'class-validator';
import { QueryStatus } from '@prisma/client';

export class FilterDonorQueriesDto {
  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;

  @IsString()
  @IsOptional()
  search?: string;

  @IsEnum(QueryStatus, { each: true })
  @IsOptional()
  status?: QueryStatus[];

  @IsOptional()
  assignedToId?: number;

  @IsOptional()
  startDate?: Date;

  @IsOptional()
  endDate?: Date;
} 