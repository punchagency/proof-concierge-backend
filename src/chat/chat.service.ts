import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { GetMessagesDto } from './dto/get-messages.dto';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Create a new chat message
   * @param createMessageDto The message data
   * @returns The created message
   */
  async createMessage(createMessageDto: CreateMessageDto) {
    try {
      const { content, senderId, recipientId, donorQueryId, fcmToken } = createMessageDto;

      // Create the message in the database
      const message = await this.prisma.chatMessage.create({
        data: {
          content,
          senderId,
          recipientId,
          donorQueryId,
          fcmToken,
        },
        include: {
          sender: true,
          recipient: true,
          donorQuery: true,
        },
      });

      // If FCM token is provided, send a push notification
      if (fcmToken && this.notificationsService.isValidFcmToken(fcmToken)) {
        const senderName = message.sender?.name || 'Admin';
        
        await this.notificationsService.sendNotification(
          fcmToken,
          {
            notification: {
              title: 'New message',
              body: `${senderName}: ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`,
            },
            data: {
              type: 'chat_message',
              messageId: message.id.toString(),
              senderId: senderId.toString(),
              senderName,
              donorQueryId: donorQueryId?.toString() || '',
              timestamp: new Date().toISOString(),
            },
            android: {
              priority: 'high',
              notification: {
                channelId: 'messages',
                priority: 'high',
              },
            },
          },
        );
      }

      return message;
    } catch (error) {
      this.logger.error(`Error creating message: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get messages based on filters
   * @param getMessagesDto Filters for messages
   * @returns List of messages
   */
  async getMessages(getMessagesDto: GetMessagesDto) {
    try {
      const { donorQueryId, senderId, recipientId, limit = 50, offset = 0 } = getMessagesDto;
      
      // Build the where clause based on provided filters
      const where: any = {};
      
      if (donorQueryId) {
        where.donorQueryId = donorQueryId;
      }
      
      if (senderId) {
        where.senderId = senderId;
      }
      
      if (recipientId) {
        where.recipientId = recipientId;
      }
      
      // If no filters are provided, return an empty array
      if (Object.keys(where).length === 0) {
        return [];
      }
      
      // Get messages from the database
      const messages = await this.prisma.chatMessage.findMany({
        where,
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              username: true,
              avatar: true,
              role: true,
            },
          },
          recipient: {
            select: {
              id: true,
              name: true,
              username: true,
              avatar: true,
              role: true,
            },
          },
          donorQuery: {
            select: {
              id: true,
              sid: true,
              donor: true,
              donorId: true,
              test: true,
              stage: true,
              status: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip: offset,
      });
      
      return messages;
    } catch (error) {
      this.logger.error(`Error getting messages: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get messages for a specific donor query
   * @param donorQueryId The donor query ID
   * @returns List of messages for the donor query
   */
  async getMessagesByDonorQuery(donorQueryId: number) {
    return this.getMessages({ donorQueryId });
  }

  /**
   * Get messages between two users
   * @param userId1 First user ID
   * @param userId2 Second user ID
   * @returns List of messages between the users
   */
  async getMessagesBetweenUsers(userId1: number, userId2: number) {
    try {
      // Get messages where either user is sender and the other is recipient
      const messages = await this.prisma.chatMessage.findMany({
        where: {
          OR: [
            {
              senderId: userId1,
              recipientId: userId2,
            },
            {
              senderId: userId2,
              recipientId: userId1,
            },
          ],
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              username: true,
              avatar: true,
              role: true,
            },
          },
          recipient: {
            select: {
              id: true,
              name: true,
              username: true,
              avatar: true,
              role: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
      
      return messages;
    } catch (error) {
      this.logger.error(`Error getting messages between users: ${error.message}`, error.stack);
      throw error;
    }
  }
}
