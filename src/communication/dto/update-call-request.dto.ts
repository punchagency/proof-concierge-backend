import { IsEnum, IsOptional, IsString } from 'class-validator';
import { CallMode, CallRequestStatus } from '@prisma/client';

export class UpdateCallRequestDto {
  @IsEnum(CallMode)
  @IsOptional()
  mode?: CallMode;

  @IsString()
  @IsOptional()
  message?: string;

  @IsEnum(CallRequestStatus)
  @IsOptional()
  status?: CallRequestStatus;
} 