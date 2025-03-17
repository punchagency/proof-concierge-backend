import { IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { MessageType } from '@prisma/client';

export class CreateAdminMessageDto {
  @IsNotEmpty()
  @IsString()
  content: string;

  @IsOptional()
  messageType?: MessageType = MessageType.CHAT;
} 