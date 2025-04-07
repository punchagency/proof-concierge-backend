import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateTextMessageDto } from '../dto/create-text-message.dto';
import { UpdateTextMessageDto } from '../dto/update-text-message.dto';
import { TextMessage } from '../entities/text-message.entity';
import { TextMessagesGateway } from '../text-messages.gateway';

@Injectable()
export class TextMessagesService {
  constructor(
    private prisma: PrismaService,
    private textMessagesGateway: TextMessagesGateway
  ) {}

  async create(ticketId: string, createTextMessageDto: CreateTextMessageDto): Promise<TextMessage> {
    // First check if the ticket exists
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
    });
    
    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${ticketId} not found`);
    }
    
    const message = await this.prisma.textMessage.create({
      data: {
        ticketId,
        senderId: createTextMessageDto.senderId,
        senderType: createTextMessageDto.senderType,
        content: createTextMessageDto.content,
      },
    }) as unknown as TextMessage;
    
    // Emit WebSocket notification for new message
    this.textMessagesGateway.notifyNewTextMessage(ticketId, message);
    
    return message;
  }

  async findByTicket(ticketId: string): Promise<TextMessage[]> {
    // First check if the ticket exists
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
    });
    
    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${ticketId} not found`);
    }
    
    return this.prisma.textMessage.findMany({
      where: { ticketId },
      orderBy: { createdAt: 'asc' },
    }) as unknown as TextMessage[];
  }

  async update(id: string, updateTextMessageDto: UpdateTextMessageDto): Promise<TextMessage> {
    const message = await this.prisma.textMessage.findUnique({
      where: { id },
      include: { ticket: true }
    });
    
    if (!message) {
      throw new NotFoundException(`Message with ID ${id} not found`);
    }
    
    const updatedMessage = await this.prisma.textMessage.update({
      where: { id },
      data: updateTextMessageDto,
    }) as unknown as TextMessage;
    
    // If message was marked as read, emit WebSocket notification
    if (updateTextMessageDto.isRead === true && !message.isRead) {
      this.textMessagesGateway.notifyMessagesRead(message.ticketId, message.senderType);
    }
    
    return updatedMessage;
  }

  async markAsRead(ticketId: string, senderType: string): Promise<void> {
    // Check if the ticket exists
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
    });
    
    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${ticketId} not found`);
    }
    
    // Mark all messages from the opposite sender type as read
    const oppositeType = senderType === 'donor' ? 'admin' : 'donor';
    
    await this.prisma.textMessage.updateMany({
      where: {
        ticketId,
        senderType: oppositeType,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });
    
    // Emit WebSocket notification for messages read
    this.textMessagesGateway.notifyMessagesRead(ticketId, senderType);
  }
} 