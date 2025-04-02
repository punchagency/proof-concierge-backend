import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { Message, MessageType, User, UserRole, QueryStatus, SenderType } from '@prisma/client';
import { NotificationsGateway } from '../../notifications/notifications.gateway';
import { Socket } from 'socket.io';

export interface CreateMessageDto {
  content: string;
  queryId?: number;
  senderId?: number;           // Only used when senderType is ADMIN
  recipientId?: number;
  messageType?: MessageType;
  roomName?: string;
  callSessionId?: number;
  fcmToken?: string;
  isFromAdmin?: boolean;       // Keep for backward compatibility
  senderType?: SenderType;     // New field for better message source tracking
  donorId?: string;            // Store donor ID when senderType is DONOR
  donorName?: string;          // Store donor name for better display
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

export interface GetMessagesWithDonorDto extends GetMessagesDto {
  donorId?: string;            // Filter by donor ID
  senderType?: SenderType;     // Filter by sender type
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

      // Determine sender type
      let senderType = data.senderType;
      if (!senderType) {
        if (data.messageType === MessageType.SYSTEM) {
          senderType = SenderType.SYSTEM;
        } else if (data.isFromAdmin) {
          senderType = SenderType.ADMIN;
        } else {
          senderType = SenderType.DONOR;
        }
      }

      // For donor messages, try to get the donor details if not provided
      let donorId = data.donorId;
      let donorName = data.donorName;
      
      if (senderType === SenderType.DONOR && data.queryId && (!donorId || !donorName)) {
        const query = await this.prisma.donorQuery.findUnique({
          where: { id: data.queryId },
          select: { donor: true, donorId: true }
        });
        
        if (query) {
          donorId = donorId || query.donorId;
          donorName = donorName || query.donor;
        }
      }

      // Create the message with appropriate data based on sender type
      const messageData: any = {
        content: data.content,
        queryId: data.queryId,
        senderId: senderType === SenderType.ADMIN ? data.senderId : null,
        recipientId: data.recipientId,
        messageType: data.messageType,
        roomName: data.roomName,
        callSessionId: data.callSessionId,
        fcmToken: data.fcmToken,
        isFromAdmin: senderType === SenderType.ADMIN, // For backward compatibility
        senderType,
        userToken: data.userToken,
        adminToken: data.adminToken,
        callRequestId: data.callRequestId,
      };

      // Add donor fields only when the sender is a donor
      if (senderType === SenderType.DONOR) {
        messageData.donorId = donorId;
        messageData.donorName = donorName;
      }

      const message = await this.prisma.message.create({
        data: messageData,
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
          let newStatus: QueryStatus | undefined;
          
          if (senderType === SenderType.ADMIN) {
            newStatus = QueryStatus.IN_PROGRESS;
          } else if (senderType === SenderType.DONOR) {
            newStatus = QueryStatus.PENDING_REPLY;
          }

          if (newStatus) {
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
      }

      // Send push notification if FCM token is provided
      if (data.fcmToken && this.notificationsService.isValidFcmToken(data.fcmToken)) {
        // Determine sender name based on sender type
        let senderName: string;
        if (senderType === SenderType.ADMIN) {
          senderName = message.sender?.name || 'Admin';
        } else if (senderType === SenderType.DONOR) {
          senderName = donorName || 'Donor';
        } else {
          senderName = 'System';
        }
        
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
              donorId: donorId || '',
              senderType: senderType,
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

      // If this is a query message from a donor, notify the assigned admin
      if (data.queryId && data.messageType === MessageType.QUERY && senderType === SenderType.DONOR) {
        // Get the query details including assigned admin
        const query = await this.prisma.donorQuery.findUnique({
          where: { id: data.queryId },
          include: {
            assignedToUser: true
          }
        });
        
        // If there's an assigned admin with FCM token, send notification
        if (query?.assignedToUser?.fcmToken) {
          const senderName = donorName || 'Donor';
          
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
                donorId: donorId || '',
                senderType: senderType,
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
      
      // Emit WebSocket event for new message with enhanced data
      if (data.queryId) {
        this.notifyNewMessage(data.queryId, message as any);
      }

      return message;
    } catch (error) {
      this.logger.error(`Error creating message: ${error.message}`, error.stack);
      throw error;
    }
  }

  // Method to notify about new messages with enhanced information
  private notifyNewMessage(queryId: number, message: any) {
    // Use type assertion for complex nested properties
    const sender = message.senderType === SenderType.ADMIN && message.senderId ? {
      id: message.senderId,
      name: (message.sender?.name) || 'Admin'
    } : message.senderType === SenderType.DONOR ? {
      donorId: message.donorId,
      name: message.donorName || 'Donor'
    } : {
      system: true
    };

    const formattedMessage = {
      id: message.id,
      content: message.content,
      queryId: message.queryId,
      messageType: message.messageType,
      senderType: message.senderType,
      sender,
      createdAt: message.createdAt,
      roomName: message.roomName,
      callSessionId: message.callSessionId,
      // Add sender identifiers to help clients filter their own messages
      senderIdentifiers: {
        senderId: message.senderId || null,
        donorId: message.donorId || null
      }
    };

    // Broadcast to all clients in the query room
    // The clients will filter out their own messages based on senderId or donorId
    this.notificationsGateway.server.to(`query-${queryId}`).emit('newMessage', formattedMessage);
    
    // Call the legacy method for backward compatibility
    this.notificationsGateway.notifyNewMessage(
      queryId,
      message.id,
      message.senderId || 0,
      message.isFromAdmin
    );
  }

  async findMessages(filters: GetMessagesWithDonorDto) {
    try {
      const { queryId, senderId, recipientId, messageType, donorId, senderType } = filters;
      const limit = typeof filters.limit === 'string' ? parseInt(filters.limit, 10) : (filters.limit || 50);
      const offset = typeof filters.offset === 'string' ? parseInt(filters.offset, 10) : (filters.offset || 0);
      
      // Build the where clause based on provided filters
      const where: any = {};
      
      if (queryId !== undefined) {
        where.queryId = queryId;
      }
      
      if (senderId !== undefined) {
        where.senderId = senderId;
      }
      
      if (recipientId !== undefined) {
        where.recipientId = recipientId;
      }
      
      if (messageType !== undefined) {
        if (Array.isArray(messageType)) {
          where.messageType = { in: messageType };
        } else {
          where.messageType = messageType;
        }
      }

      // Add donor and sender type filters
      if (donorId !== undefined) {
        where.donorId = donorId;
      }
      
      if (senderType !== undefined) {
        where.senderType = senderType;
      }
      
      const messages = await this.prisma.message.findMany({
        where,
        select: {
          id: true,
          content: true,
          queryId: true,
          senderId: true,
          recipientId: true,
          messageType: true,
          isFromAdmin: true,
          senderType: true,    // New field
          donorId: true,       // New field
          donorName: true,     // New field
          roomName: true,
          callSessionId: true,
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
      
      return messages;
    } catch (error) {
      this.logger.error(`Error finding messages: ${error.message}`, error.stack);
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

  /**
   * Find all messages from a specific donor across all queries
   */
  async findMessagesByDonor(donorId: string) {
    return this.prisma.message.findMany({
      where: {
        donorId,
      },
      include: {
        query: {
          select: {
            id: true,
            status: true,
            donor: true,
            test: true,
            stage: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
} 