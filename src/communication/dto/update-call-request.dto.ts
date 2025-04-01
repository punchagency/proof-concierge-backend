import { IsEnum, IsOptional, IsString } from 'class-validator';
import { CallRequestStatus } from '@prisma/client';

export class UpdateCallRequestDto {
  @IsString()
  @IsOptional()
  message?: string;

  @IsEnum(CallRequestStatus)
  @IsOptional()
  status?: CallRequestStatus;
} 