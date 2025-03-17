import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { QueryMode, QueryStatus } from '@prisma/client';

export class CreateDonorQueryDto {
  @IsString()
  @IsNotEmpty()
  sid: string;

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
  stage: string;

  @IsEnum(['TEXT', 'HUDDLE', 'VIDEO_CALL'], {
    message: 'queryMode must be one of the following values: TEXT, HUDDLE, VIDEO_CALL'
  })
  queryMode: QueryMode;

  @IsString()
  @IsNotEmpty()
  device: string;

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
} 