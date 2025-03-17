import { IsEnum, IsOptional } from 'class-validator';
import { CallMode } from '@prisma/client';

export class StartCallDto {
  @IsEnum(CallMode)
  @IsOptional()
  mode?: CallMode = CallMode.VIDEO;
} 