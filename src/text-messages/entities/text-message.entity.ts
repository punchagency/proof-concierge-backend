import { ApiProperty } from '@nestjs/swagger';

export class TextMessage {
  @ApiProperty({ description: 'Unique identifier for the message' })
  id: string;

  @ApiProperty({ description: 'ID of the ticket this message belongs to' })
  ticketId: string;

  @ApiProperty({ description: 'ID of the message sender' })
  senderId: string;

  @ApiProperty({ description: 'Type of sender: donor or admin' })
  senderType: string;

  @ApiProperty({ description: 'Content of the message' })
  content: string;

  @ApiProperty({ description: 'Type of message', default: 'text' })
  messageType: string;

  @ApiProperty({ description: 'Whether the message has been read', default: false })
  isRead: boolean;

  @ApiProperty({ description: 'When the message was created' })
  createdAt: Date;

  @ApiProperty({ description: 'When the message was last updated' })
  updatedAt: Date;
}

export enum SenderType {
  DONOR = 'donor',
  ADMIN = 'admin',
  SYSTEM = 'system',
}

export enum MessageType {
  TEXT = 'text',
  SYSTEM = 'system',
} 