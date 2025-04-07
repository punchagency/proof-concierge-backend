import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';
import { SenderType } from '../entities/text-message.entity';

export class CreateTextMessageDto {
  @ApiProperty({ description: 'ID of the sender' })
  @IsString()
  senderId: string;

  @ApiProperty({ description: 'Type of sender: donor or admin', enum: SenderType })
  @IsEnum(SenderType)
  senderType: SenderType;

  @ApiProperty({ description: 'Content of the message' })
  @IsString()
  content: string;
} 