import { IsOptional, IsString } from 'class-validator';

export class CreateCallRequestDto {
  @IsString()
  @IsOptional()
  message?: string;
} 