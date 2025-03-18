import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CallMode } from '@prisma/client';

export class CreateCallRequestDto {
  @IsEnum(CallMode)
  @IsNotEmpty()
  mode: CallMode = CallMode.VIDEO;

  @IsString()
  @IsOptional()
  message?: string;
} 