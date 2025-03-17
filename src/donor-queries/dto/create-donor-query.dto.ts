import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { QueryMode } from '@prisma/client';

export class CreateDonorQueryDto {
  @IsString()
  @IsNotEmpty()
  donor: string;

  @IsString()
  @IsNotEmpty()
  donorId: string;

  @IsString()
  @IsNotEmpty()
  test: string;

  @IsString()
  @IsNotEmpty()
  stage: string

  @IsString()
  @IsNotEmpty()
  device: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsOptional()
  resolvedById?: number;

  @IsOptional()
  transferredToUserId?: number;

  @IsString()
  @IsOptional()
  transferredTo?: string;

  @IsString()
  @IsOptional()
  transferNote?: string;
} 