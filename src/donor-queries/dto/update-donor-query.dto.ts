import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { QueryStatus } from '@prisma/client';

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

  @IsString()
  @IsOptional()
  device?: string;

  @IsEnum(QueryStatus)
  @IsOptional()
  status?: QueryStatus;

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

  @IsString()
  @IsOptional()
  fcmToken?: string;
} 