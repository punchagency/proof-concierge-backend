import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { Message, MessageType, CallMode, User, UserRole, QueryStatus } from '@prisma/client';
import { NotificationsGateway } from '../../notifications/notifications.gateway';

export interface CreateMessageDto {
  content: string;
  queryId?: number;
  senderId?: number;
  recipientId?: number;
  messageType?: MessageType;
  callMode?: CallMode;
  roomName?: string;
  callSessionId?: number;
  fcmToken?: string;
  isFromAdmin?: boolean;
  userToken?: string;
  adminToken?: string;
  callRequestId?: number;
}

export interface GetMessagesDto {
  queryId?: number;
  senderId?: number;
  recipientId?: number;
  messageType?: MessageType | MessageType[];
  limit?: number;
  offset?: number;
}

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private notificationsGateway: NotificationsGateway,
  ) {}

  async create(data: CreateMessageDto): Promise<Message> {
    try {
      // Set default message type if not provided
      if (!data.messageType) {
        data.messageType = data.queryId ? MessageType.QUERY : MessageType.CHAT;
      }

      const message = await this.prisma.message.create({
        data: {
          content: data.content,
          queryId: data.queryId,
          senderId: data.senderId,
          recipientId: data.recipientId,
          messageType: data.messageType,
          callMode: data.callMode,
          roomName: data.roomName,
          callSessionId: data.callSessionId,
          fcmToken: data.fcmToken,
          isFromAdmin: data.isFromAdmin ?? false,
          userToken: data.userToken,
          adminToken: data.adminToken,
          callRequestId: data.callRequestId,
        },
        include: {
          sender: true,
          recipient: true,
          query: true,
          callSession: true,
          callRequest: data.callRequestId ? true : undefined,
        },
      });

      // Update query status based on who sent the message
      if (data.queryId && data.messageType === MessageType.QUERY) {
        // Get current query status
        const query = await this.prisma.donorQuery.findUnique({
          where: { id: data.queryId },
          select: { status: true }
        });
        
        // Only update status if it's not already resolved or transferred
        if (query && query.status !== QueryStatus.RESOLVED && query.status !== QueryStatus.TRANSFERRED) {
          // Only update status for normal query messages, not system messages
          const isFromAdmin = data.isFromAdmin ?? false;
          let newStatus: QueryStatus;
          
          if (isFromAdmin) {
            newStatus = QueryStatus.IN_PROGRESS;
          } else {
            newStatus = QueryStatus.PENDING_REPLY;
          }

          // Update the query status
          await this.prisma.donorQuery.update({
            where: { id: data.queryId },
            data: { status: newStatus },
          });
          
          // Emit WebSocket event for status change
          this.notificationsGateway.notifyQueryStatusChange(
            data.queryId,
            newStatus
          );
        }
      }

      // Send push notification if FCM token is provided
      if (data.fcmToken && this.notificationsService.isValidFcmToken(data.fcmToken)) {
        const senderName = message.sender?.name || 'Admin';
        
        await this.notificationsService.sendNotification(
          data.fcmToken,
          {
            notification: {
              title: 'New message',
              body: `${senderName}: ${data.content.substring(0, 100)}${data.content.length > 100 ? '...' : ''}`,
            },
            data: {
              type: 'message',
              messageId: message.id.toString(),
              senderId: data.senderId?.toString() || '',
              senderName,
              queryId: data.queryId?.toString() || '',
              messageType: data.messageType,
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

      // If this is a query message, also notify the assigned admin
      if (data.queryId && data.messageType === MessageType.QUERY && !data.isFromAdmin) {
        // Get the query details including assigned admin
        const query = await this.prisma.donorQuery.findUnique({
          where: { id: data.queryId },
          include: {
            assignedToUser: true
          }
        });
        
        // If there's an assigned admin with FCM token, send notification
        if (query?.assignedToUser?.fcmToken) {
          const senderName = message.sender?.name || 'Donor';
          
          await this.notificationsService.sendNotification(
            query.assignedToUser.fcmToken,
            {
              notification: {
                title: `New message for query #${data.queryId}`,
                body: `${senderName}: ${data.content.substring(0, 100)}${data.content.length > 100 ? '...' : ''}`,
              },
              data: {
                type: 'query_message',
                messageId: message.id.toString(),
                queryId: data.queryId.toString(),
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
      }
      
      // Emit WebSocket event for new message
      if (data.queryId) {
        this.notificationsGateway.notifyNewMessage(
          data.queryId,
          message.id,
          data.senderId || 0,
          data.isFromAdmin || false
        );
      }

      return message;
    } catch (error) {
      this.logger.error(`Error creating message: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findMessages(filters: GetMessagesDto) {
    try {
      const { queryId, senderId, recipientId, messageType } = filters;
      const limit = typeof filters.limit === 'string' ? parseInt(filters.limit, 10) : (filters.limit || 50);
      const offset = typeof filters.offset === 'string' ? parseInt(filters.offset, 10) : (filters.offset || 0);
      
      // Build the where clause based on provided filters
      const where: any = {};
      
      if (queryId) {
        where.queryId = queryId;
      }
      
      if (senderId) {
        where.senderId = senderId;
      }
      
      if (recipientId) {
        where.recipientId = recipientId;
      }

      if (messageType) {
        where.messageType = Array.isArray(messageType) 
          ? { in: messageType }
          : messageType;
      }
      
      // Get messages from the database
      const messages = await this.prisma.message.findMany({
        where,
        select: {
          id: true,
          content: true,
          queryId: true,
          senderId: true,
          recipientId: true,
          messageType: true,
          callMode: true,
          roomName: true,
          callSessionId: true,
          isFromAdmin: true,
          createdAt: true,
          updatedAt: true,
          sender: {
            select: {
              id: true,
              name: true,
              username: true,
              avatar: true,
              role: true,
              isActive: true,
            },
          },
          recipient: {
            select: {
              id: true,
              name: true,
              username: true,
              avatar: true,
              role: true,
              isActive: true,
            },
          },
          query: {
            select: {
              id: true,
              donor: true,
              donorId: true,
              test: true,
              stage: true,
              status: true,
              assignedToUser: {
                select: {
                  id: true,
                  name: true,
                  role: true,
                },
              },
            },
          },
          callSession: {
            select: {
              id: true,
              mode: true,
              status: true,
              roomName: true,
              userToken: true,
              adminToken: true,
              startedAt: true,
              endedAt: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip: offset,
      });
      
      // Transform messages to ensure proper formatting and explicit admin status
      const transformedMessages = messages.map(msg => {
        const result = {
          ...msg,
          isFromAdmin: msg.isFromAdmin || false, // Ensure boolean value
        };
        
        // Add sender information if available
        if (msg.senderId) {
          result.sender = {
            id: msg.senderId,
            name: msg.sender?.name || '',
            username: msg.sender?.username || '',
            role: msg.sender?.role || UserRole.ADMIN,
            avatar: msg.sender?.avatar || null,
            isActive: msg.sender?.isActive || true
          };
        }
        
        // Add recipient information if available
        if (msg.recipientId) {
          result.recipient = {
            id: msg.recipientId,
            name: msg.recipient?.name || '',
            username: msg.recipient?.username || '',
            role: msg.recipient?.role || UserRole.ADMIN,
            avatar: msg.recipient?.avatar || null,
            isActive: msg.recipient?.isActive || true
          };
        }
        
        return result;
      });
      
      return transformedMessages;
    } catch (error) {
      this.logger.error(`Error getting messages: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findMessagesBetweenUsers(userId1: number, userId2: number) {
    try {
      const messages = await this.prisma.message.findMany({
        where: {
          messageType: MessageType.CHAT,
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

  async findQueryMessages(queryId: number) {
    return this.findMessages({ 
      queryId, 
      messageType: [
        MessageType.QUERY,
        MessageType.CHAT,
        MessageType.SYSTEM,
        MessageType.CALL_STARTED,
        MessageType.CALL_ENDED
      ],
    });
  }

  async findCallMessages(queryId: number) {
    return this.findMessages({
      queryId,
      messageType: [MessageType.CALL_STARTED, MessageType.CALL_ENDED, MessageType.SYSTEM],
    });
  }

  async validateAdminAccess(queryId: number, adminId: number) {
    try {
      const query = await this.prisma.donorQuery.findFirst({
        where: {
          id: queryId,
          assignedToUser: {
            id: adminId
          }
        },
      });
      return query;
    } catch (error) {
      this.logger.error(`Error validating admin access: ${error.message}`, error.stack);
      throw error;
    }
  }
} 