import { IsOptional, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class GetMessagesDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  donorQueryId?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  senderId?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  recipientId?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number = 50;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  offset?: number = 0;
} 