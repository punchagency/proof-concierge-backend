import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateTextMessageDto {
  @ApiProperty({ description: 'Whether the message has been read' })
  @IsBoolean()
  isRead: boolean;
} 