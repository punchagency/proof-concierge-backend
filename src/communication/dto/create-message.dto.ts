import { IsNotEmpty, IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateMessageDto {
  @IsNotEmpty()
  @IsString()
  content: string;

  @IsNotEmpty()
  @IsNumber()
  senderId: number;

  @IsOptional()
  @IsNumber()
  recipientId?: number;

  @IsOptional()
  @IsNumber()
  donorQueryId?: number;

  @IsOptional()
  @IsString()
  fcmToken?: string;
} 