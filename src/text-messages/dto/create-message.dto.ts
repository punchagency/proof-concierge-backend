import { MessageType } from '@prisma/client';

export class MessageDto {
  content: string;
  queryId?: number;
  senderId?: number;
  recipientId?: number;
  messageType?: MessageType;
  roomName?: string;
  callSessionId?: number;
  isFromAdmin?: boolean;
} 