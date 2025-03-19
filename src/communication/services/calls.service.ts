import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { PrismaService } from '../../database/prisma.service';
import { CallMode, CallStatus, MessageType, Prisma, CallSession } from '@prisma/client';
import { MessagesService } from './messages.service';
import { NotificationsService } from '../../notifications/notifications.service';

@Injectable()
export class CallsService implements OnModuleInit {
  private readonly logger = new Logger(CallsService.name);
  private apiKey!: string;
  private domain!: string;
  private isInitialized = false;

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
    private prisma: PrismaService,
    private messagesService: MessagesService,
    private notificationsService: NotificationsService,
  ) {}

  onModuleInit() {
    try {
      const apiKey = this.configService.get<string>('DAILY_API_KEY');
      const domain = this.configService.get<string>('DAILY_DOMAIN');

      if (!apiKey) {
        this.logger.error('DAILY_API_KEY environment variable is not set');
        return;
      }
      if (!domain) {
        this.logger.error('DAILY_DOMAIN environment variable is not set');
        return;
      }

      this.apiKey = apiKey;
      this.domain = domain;
      this.isInitialized = true;
      this.logger.log('Daily.co API initialized successfully');
    } catch (error) {
      this.logger.error('Error initializing Daily.co API:', error);
    }
  }

  async startCall(queryId: number, adminId: number, mode: CallMode = CallMode.VIDEO) {
    if (!this.isInitialized) {
      throw new Error('Daily.co API not initialized');
    }

    console.log('queryId', queryId);
    console.log('adminId', adminId);
    console.log('mode', mode);

    try {
      // First check if the query exists
      const donorQuery = await this.prisma.donorQuery.findUnique({
        where: { id: queryId },
      });

      if (!donorQuery) {
        throw new Error(`Donor query with ID ${queryId} not found`);
      }

      // Validate adminId
      if (adminId === undefined || adminId === null) {
        throw new Error('Admin ID is required');
      }
      
      // Verify admin exists in the database
      const admin = await this.prisma.user.findUnique({
        where: { id: adminId },
      });
      
      if (!admin) {
        throw new Error(`Admin with ID ${adminId} not found`);
      }

      // Ensure mode is a valid CallMode enum value
      let callMode = mode;
      if (typeof mode === 'string') {
        // Convert string to enum
        if (mode.toUpperCase() === 'VIDEO') {
          callMode = CallMode.VIDEO;
        } else if (mode.toUpperCase() === 'AUDIO') {
          callMode = CallMode.AUDIO;
        } else if (mode.toUpperCase() === 'SCREEN') {
          callMode = CallMode.SCREEN;
        } else {
          callMode = CallMode.VIDEO; // Default to VIDEO if invalid
        }
      }

      // Create a room in Daily.co
      const room = await this.createPrivateRoom({ mode: callMode });
      
      // Generate tokens
      const adminToken = await this.createMeetingToken(room.name, true, callMode);
      const userToken = await this.createMeetingToken(room.name, false, callMode);

      // Create call session in database with tokens
      const callSession = await this.prisma.callSession.create({
        data: {
          roomName: room.name,
          mode: callMode,
          status: CallStatus.CREATED,
          userToken: userToken,
          adminToken: adminToken,
          query: {
            connect: { id: queryId }
          },
          admin: {
            connect: { id: adminId }
          }
        },
        include: {
          query: true,
          admin: true,
        },
      });

      // Check if this call is from accepting a call request
      const isFromCallRequest = await this.prisma.callRequest.findFirst({
        where: {
          queryId: queryId,
          status: 'ACCEPTED',
          adminId: adminId,
        },
        orderBy: {
          updatedAt: 'desc',
        },
      });

      // Only create a call started message if it's not from accepting a call request
      if (!isFromCallRequest) {
        await this.createCallStartedMessage(queryId, adminId, callSession, callMode);
      }

      return {
        callSession,
        room,
        tokens: {
          admin: adminToken,
          user: userToken,
        },
      };
    } catch (error) {
      this.logger.error('Error starting call:', error);
      throw error;
    }
  }

  async endCall(roomName: string, adminId: number) {
    if (!this.isInitialized) {
      throw new Error('Daily.co API not initialized');
    }

    try {
      const callSession = await this.prisma.callSession.update({
        where: { roomName },
        data: {
          status: CallStatus.ENDED,
          endedAt: new Date(),
        },
        include: {
          query: true,
        },
      });

      // Create message for call ended
      await this.messagesService.create({
        queryId: callSession.queryId,
        senderId: adminId,
        content: 'Call ended',
        messageType: MessageType.CALL_ENDED,
        callMode: callSession.mode,
        roomName,
        callSessionId: callSession.id,
      });

      // Delete the room in Daily.co
      await this.deleteRoom(roomName);

      return callSession;
    } catch (error) {
      this.logger.error('Error ending call:', error);
      throw error;
    }
  }

  async updateCallStatus(roomName: string, status: CallStatus) {
    const callSession = await this.prisma.callSession.update({
      where: { roomName },
      data: { 
        status,
        startedAt: status === CallStatus.STARTED ? new Date() : undefined,
      },
      include: {
        query: true,
      },
    });

    if (status === CallStatus.STARTED) {
      // Create a message when admin joins the call
      await this.messagesService.create({
        queryId: callSession.queryId,
        senderId: callSession.adminId,
        content: 'Admin joined the call',
        messageType: MessageType.SYSTEM,
        callMode: callSession.mode,
        roomName,
        callSessionId: callSession.id,
      });
    }

    return callSession;
  }

  private async createPrivateRoom(options: {
    expiryMinutes?: number;
    customRoomName?: string;
    mode?: CallMode;
  } = {}) {
    if (!this.isInitialized) {
      throw new Error('Daily.co API not initialized');
    }

    try {
      const url = 'https://api.daily.co/v1/rooms';
      const { expiryMinutes = 120, customRoomName, mode = CallMode.VIDEO } = options;

      this.logger.log(`Creating private room with mode: ${mode}, expiryMinutes: ${expiryMinutes}`);

      const roomConfig = {
        properties: {
          max_participants: 2,
          enable_screenshare: true,
          enable_chat: true,
          start_video_off: mode === CallMode.AUDIO,
          start_audio_off: false,
          exp: Math.floor(Date.now() / 1000) + expiryMinutes * 60,
        },
        privacy: 'private',
        name: customRoomName,
      };

      const response = await lastValueFrom(
        this.httpService.post(url, roomConfig, {
          headers: { Authorization: `Bearer ${this.apiKey}` },
        }),
      );

      if (!response?.data) {
        throw new Error('No response received from Daily API');
      }

      this.logger.log(`Room created successfully: ${response.data.name}`);
      return response.data;
    } catch (error) {
      this.handleDailyApiError(error, 'Error creating private room');
      throw error;
    }
  }

  private async createMeetingToken(roomName: string, isAdmin: boolean = false, mode: CallMode = CallMode.VIDEO) {
    if (!this.isInitialized) {
      throw new Error('Daily.co API not initialized');
    }

    try {
      const url = 'https://api.daily.co/v1/meeting-tokens';
      this.logger.log(`Creating meeting token for room: ${roomName}, isAdmin: ${isAdmin}, mode: ${mode}`);

      const tokenConfig = {
        properties: {
          room_name: roomName,
          is_owner: isAdmin,
          enable_screenshare: true,
          start_video_off: mode === CallMode.AUDIO,
          start_audio_off: false,
          exp: Math.floor(Date.now() / 1000) + 120 * 60, // Token expires in 2 hours
        },
      };

      const response = await lastValueFrom(
        this.httpService.post(url, tokenConfig, {
          headers: { Authorization: `Bearer ${this.apiKey}` },
        }),
      );

      if (!response?.data) {
        throw new Error('No response received from Daily API');
      }

      this.logger.log(`Meeting token created successfully for room: ${roomName}`);
      return response.data.token as string;
    } catch (error) {
      this.logger.error(`Error creating meeting token for room: ${roomName}`, error);
      throw error;
    }
  }

  private handleDailyApiError(error: any, context: string) {
    if (error instanceof AxiosError) {
      const status = error.response?.status;
      const data = error.response?.data;
      
      this.logger.error(`${context}: ${error.message}`, {
        status,
        data,
        url: error.config?.url,
        method: error.config?.method,
      });
    } else {
      this.logger.error(`${context}: ${error.message}`, error.stack);
    }
  }

  async deleteRoom(roomName: string) {
    if (!this.isInitialized) {
      throw new Error('Daily.co API not initialized');
    }

    try {
      const url = `https://api.daily.co/v1/rooms/${roomName}`;
      this.logger.log(`Deleting room: ${roomName}`);

      await lastValueFrom(
        this.httpService.delete(url, {
          headers: { Authorization: `Bearer ${this.apiKey}` },
        }),
      );

      this.logger.log(`Room deleted successfully: ${roomName}`);
    } catch (error) {
      this.logger.error(`Error deleting room: ${roomName}`, error);
      throw error;
    }
  }

  // Get the Daily.co domain for constructing room URLs
  getDomain(): string {
    return this.domain;
  }

  // Add the missing methods
  async requestCall(queryId: number, mode: CallMode = CallMode.VIDEO) {
    try {
      // Ensure mode is a valid CallMode enum value
      let callMode = mode;
      if (typeof mode === 'string') {
        // Convert string to enum
        if (mode.toUpperCase() === 'VIDEO') {
          callMode = CallMode.VIDEO;
        } else if (mode.toUpperCase() === 'AUDIO') {
          callMode = CallMode.AUDIO;
        } else if (mode.toUpperCase() === 'SCREEN') {
          callMode = CallMode.SCREEN;
        } else {
          callMode = CallMode.VIDEO; // Default to VIDEO if invalid
        }
      }

      // Get the query to ensure it exists and get donor details
      const query = await this.prisma.donorQuery.findUnique({
        where: { id: queryId },
        include: {
          assignedToUser: true,
        },
      });

      if (!query) {
        throw new Error('Query not found');
      }

      // Create a call request in the database
      const callRequest = await this.prisma.callRequest.create({
        data: {
          mode: callMode,
          query: {
            connect: { id: queryId }
          },
          message: `Donor requested a ${callMode} call`,
        },
        include: {
          query: true,
        },
      });

      // Create a message linked to the call request
      const message = await this.messagesService.create({
        content: `Donor requested a ${callMode} call`,
        queryId,
        messageType: MessageType.SYSTEM,
        callMode: callMode,
        callRequestId: callRequest.id,
      });

      // If there's an assigned admin, send them a notification
      if (query.assignedToUser?.fcmToken) {
        await this.notificationsService.sendNotification(
          query.assignedToUser.fcmToken,
          {
            notification: {
              title: 'Call Request',
              body: `Donor requested a ${callMode} call for query #${queryId}`,
            },
            data: {
              type: 'call_request',
              queryId: queryId.toString(),
              callRequestId: callRequest.id.toString(),
              mode: callMode,
              timestamp: new Date().toISOString(),
            },
            android: {
              priority: 'high',
              notification: {
                channelId: 'calls',
                priority: 'high',
              },
            },
          },
        );
      }

      return {
        callRequest,
        message,
        query,
      };
    } catch (error) {
      this.logger.error('Error requesting call:', error);
      throw error;
    }
  }

  async validateAdminAccess(queryId: number, adminId: number): Promise<boolean> {
    try {
      // Validate inputs
      if (!queryId) {
        this.logger.error('Query ID is required for validateAdminAccess');
        return false;
      }
      
      if (!adminId) {
        this.logger.error('Admin ID is required for validateAdminAccess');
        return false;
      }
      
      // First check if the admin exists
      const admin = await this.prisma.user.findUnique({
        where: { id: adminId },
      });
      
      if (!admin) {
        this.logger.error(`Admin with ID ${adminId} not found`);
        return false;
      }
      
      // Check if admin is a super admin - they can access all queries
      if (admin.role === 'SUPER_ADMIN') {
        return true;
      }
      
      // Check if the admin is assigned to this query
      const query = await this.prisma.donorQuery.findUnique({
        where: { 
          id: queryId,
          assignedToId: adminId,
        },
      });
      
      if (!query) {
        this.logger.warn(`Admin ${adminId} is not assigned to query ${queryId}`);
        return false;
      }
      
      return true;
    } catch (error) {
      this.logger.error(`Error validating admin access: ${error.message}`, error.stack);
      return false;
    }
  }

  async acceptCallRequest(queryId: number, adminId: number, callRequestId?: number) {
    try {
      // Validate adminId
      if (adminId === undefined || adminId === null) {
        throw new Error('Admin ID is required');
      }
      
      // Verify admin exists in the database
      const admin = await this.prisma.user.findUnique({
        where: { id: adminId },
      });
      
      if (!admin) {
        throw new Error(`Admin with ID ${adminId} not found`);
      }
      
      // Find the call request to accept
      let callRequest;
      
      if (callRequestId) {
        // If a specific call request ID is provided, use that
        callRequest = await this.prisma.callRequest.findUnique({
          where: { 
            id: callRequestId,
            queryId: queryId // Ensure it belongs to the specified query
          },
          include: {
            query: true,
          },
        });
        
        if (!callRequest) {
          throw new Error(`Call request with ID ${callRequestId} not found for query ${queryId}`);
        }
      } else {
        // Otherwise, get the latest pending call request for the query
        callRequest = await this.prisma.callRequest.findFirst({
          where: {
            queryId: queryId,
            status: 'PENDING',
          },
          orderBy: {
            createdAt: 'desc',
          },
          include: {
            query: true,
          },
        });
      }

      if (!callRequest) {
        throw new Error('No pending call request found for this query');
      }

      // Update the call request status to ACCEPTED
      await this.prisma.callRequest.update({
        where: { id: callRequest.id },
        data: {
          status: 'ACCEPTED',
          adminId: adminId, // Assign the admin who accepted it
          updatedAt: new Date(),
        },
      });

      // Start the call using the requested mode, but don't create an additional call started message
      const result = await this.startCall(queryId, adminId, callRequest.mode);

      // Find the original call request message to update it
      const originalMessage = await this.prisma.message.findFirst({
        where: {
          callRequestId: callRequest.id,
          messageType: MessageType.SYSTEM,
        },
      });

      if (originalMessage) {
        // Update the existing message with call details
        const roomUrl = `https://${this.getDomain()}/${result.room.name}`;
        const updatedContent = `${originalMessage.content}\n\n**✅ ACCEPTED by ${admin.name}**\n\n**Join the call:** [Click here to join the ${callRequest.mode} call](${roomUrl})`;
        
        await this.prisma.message.update({
          where: { id: originalMessage.id },
          data: {
            content: updatedContent,
            callMode: callRequest.mode,
            roomName: result.room.name,
            callSessionId: result.callSession.id,
            userToken: result.tokens.user,
            adminToken: result.tokens.admin,
            updatedAt: new Date(),
          },
        });
      } else {
        // If for some reason the original message doesn't exist, create a new one
        await this.messagesService.create({
          content: `Call request accepted by ${admin.name}. Join the call: ${this.getDomain()}/${result.room.name}`,
          queryId,
          senderId: adminId,
          messageType: MessageType.SYSTEM,
          callMode: callRequest.mode,
          roomName: result.room.name,
          callSessionId: result.callSession.id,
          callRequestId: callRequest.id,
          userToken: result.tokens.user,
          adminToken: result.tokens.admin,
        });
      }

      return {
        ...result,
        callRequest,
      };
    } catch (error) {
      this.logger.error('Error accepting call request:', error);
      throw error;
    }
  }

  async createCallStartedMessage(queryId: number, adminId: number, callSession: CallSession, mode: CallMode) {
    const content = `Call started by admin. Mode: ${mode}`;
    
    // Create the message with isFromAdmin set to true
    return this.messagesService.create({
      content,
      queryId,
      senderId: adminId,
      messageType: MessageType.CALL_STARTED,
      callMode: mode,
      roomName: callSession.roomName,
      callSessionId: callSession.id,
      userToken: callSession.userToken || undefined,  // Handle null case
      adminToken: callSession.adminToken || undefined,  // Handle null case
      isFromAdmin: true  // Set this to true for call-started messages
    });
  }

  async getCallRequests(queryId: number) {
    try {
      return await this.prisma.callRequest.findMany({
        where: {
          queryId: queryId,
          status: 'PENDING',
        },
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          admin: {
            select: {
              id: true,
              name: true,
              username: true,
              avatar: true,
            },
          },
        },
      });
    } catch (error) {
      this.logger.error('Error getting call requests:', error);
      throw error;
    }
  }

  async rejectCallRequest(callRequestId: number, adminId: number) {
    try {
      const callRequest = await this.prisma.callRequest.findUnique({
        where: { id: callRequestId },
        include: {
          query: true,
        },
      });

      if (!callRequest) {
        throw new Error(`Call request with ID ${callRequestId} not found`);
      }

      // Get admin details
      const admin = await this.prisma.user.findUnique({
        where: { id: adminId },
      });
      
      if (!admin) {
        throw new Error(`Admin with ID ${adminId} not found`);
      }

      // Update the call request status to REJECTED
      const updatedCallRequest = await this.prisma.callRequest.update({
        where: { id: callRequestId },
        data: {
          status: 'REJECTED',
          adminId: adminId, // Record which admin rejected it
          updatedAt: new Date(),
        },
        include: {
          query: true,
        },
      });

      // Find the original call request message
      const originalMessage = await this.prisma.message.findFirst({
        where: {
          callRequestId: callRequest.id,
          messageType: MessageType.SYSTEM,
        },
      });

      if (originalMessage) {
        // Update the existing message instead of creating a new one
        const updatedContent = `${originalMessage.content}\n\n**❌ REJECTED by ${admin.name}**`;
        
        await this.prisma.message.update({
          where: { id: originalMessage.id },
          data: {
            content: updatedContent,
            updatedAt: new Date(),
          },
        });
      } else {
        // If for some reason the original message doesn't exist, create a new one
        await this.messagesService.create({
          content: `Call request rejected by ${admin.name}`,
          queryId: callRequest.queryId,
          senderId: adminId,
          messageType: MessageType.SYSTEM,
          callRequestId: callRequest.id,
        });
      }

      return updatedCallRequest;
    } catch (error) {
      this.logger.error('Error rejecting call request:', error);
      throw error;
    }
  }

  async getCallsForQuery(queryId: number) {
    try {
      return await this.prisma.callSession.findMany({
        where: {
          queryId,
        },
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          admin: {
            select: {
              id: true,
              name: true,
              username: true,
              email: true,
              role: true,
            },
          },
        },
      });
    } catch (error) {
      this.logger.error(`Error getting calls for query ${queryId}:`, error);
      throw error;
    }
  }

  async getCallSessionById(callSessionId: number) {
    try {
      const callSession = await this.prisma.callSession.findUnique({
        where: {
          id: callSessionId,
        },
        include: {
          admin: {
            select: {
              id: true,
              name: true,
              username: true,
              email: true,
              role: true,
            },
          },
          query: true,
          messages: {
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      });

      if (!callSession) {
        throw new Error(`Call session with ID ${callSessionId} not found`);
      }

      return callSession;
    } catch (error) {
      this.logger.error(`Error getting call session with ID ${callSessionId}:`, error);
      throw error;
    }
  }
}