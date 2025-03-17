import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { QueryMode } from '@prisma/client';

export class UpdateDonorQueryDto {
  @IsString()
  @IsOptional()
  donor?: string;

  @IsString()
  @IsOptional()
  donorId?: string;

  @IsString()
  @IsOptional()
  test?: string;

  @IsString()
  @IsOptional()
  stage?: string;

  @IsEnum(QueryMode)
  @IsOptional()
  queryMode?: QueryMode;

  @IsString()
  @IsOptional()
  device?: string;

  @IsNumber()
  @IsOptional()
  resolvedById?: number;

  @IsNumber()
  @IsOptional()
  transferredToUserId?: number;

  @IsString()
  @IsOptional()
  transferredTo?: string;

  @IsString()
  @IsOptional()
  transferNote?: string;
} 