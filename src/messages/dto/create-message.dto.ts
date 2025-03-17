import { MessageType, CallMode } from '@prisma/client';

export class CreateMessageDto {
  content: string;
  queryId?: number;
  senderId: number;
  recipientId?: number;
  messageType?: MessageType;
  callMode?: CallMode;
  roomName?: string;
  callSessionId?: number;
  isFromAdmin?: boolean;
} 