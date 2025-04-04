import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { PrismaService } from '../../database/prisma.service';
import {
  CallStatus,
  MessageType,
  Prisma,
  CallSession,
  SenderType,
} from '@prisma/client';
import { MessagesService } from './messages.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { EmailService } from '../../notifications/email.service';
import { Cron, CronExpression } from '@nestjs/schedule';

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
    private emailService: EmailService,
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

  async startCall(
    queryId: number,
    adminId: number,
    callType: string = 'video', // Default to video call if not specified
  ) {
    if (!this.isInitialized) {
      throw new Error('Daily.co API not initialized');
    }

    console.log('queryId', queryId);
    console.log('adminId', adminId);
    console.log('callType', callType);

    try {
      // First check if the query exists
      const donorQuery = await this.prisma.donorQuery.findUnique({
        where: { id: queryId },
        include: { // Include FCM token for notification
          assignedToUser: true
        }
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

      // Check if there are any active calls for this query
      const existingActiveCalls = await this.prisma.callSession.findMany({
        where: {
          queryId,
          status: {
            in: [CallStatus.CREATED, CallStatus.STARTED],
          },
        },
      });

      if (existingActiveCalls.length > 0) {
        this.logger.warn(
          `Cannot start a new call for query ${queryId} - ${existingActiveCalls.length} active call(s) already exist`,
        );
        throw new Error(
          `There is already an active call for this query. Please end the existing call before starting a new one.`,
        );
      }

      // Create a room in Daily.co
      const room = await this.createPrivateRoom();

      // Generate tokens
      const adminToken = await this.createMeetingToken(
        room.name,
        true,
      );
      const userToken = await this.createMeetingToken(
        room.name,
        false,
      );

      // Create call session in database with tokens
      let callSession = await this.prisma.callSession.create({
        data: {
          roomName: room.name,
          status: CallStatus.CREATED,
          userToken: userToken,
          adminToken: adminToken,
          callType: callType, // Store the call type in the database
          query: {
            connect: { id: queryId },
          },
          admin: {
            connect: { id: adminId },
          },
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
          // Only consider recently accepted call requests (within the last 10 seconds)
          updatedAt: {
            gte: new Date(Date.now() - 10 * 1000), // 10 seconds ago
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
      });

      // Only create a call started message if it's not from accepting a call request
      if (!isFromCallRequest) {
        this.logger.log(
          `Call is not from a call request. Creating call started message for queryId: ${queryId}`,
        );
        await this.createCallStartedMessage(
          queryId,
          adminId,
          callSession,
          callType,
        );
      } else {
        this.logger.log(
          `Call is from a call request. Not creating a separate call started message for queryId: ${queryId}`,
        );
      }

      // Pass the fcmToken directly since it might be missing from the query relation
      return {
        callSession,
        room,
        tokens: {
          admin: adminToken,
          user: userToken,
        },
        // Add separate fields for notification data
        notificationData: {
          fcmToken: donorQuery.fcmToken,
          adminName: admin.name
        }
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

      // First, check if this call was from a donor call request
      const donorCallRequestMessage = await this.prisma.message.findFirst({
        where: {
          callSessionId: callSession.id,
          messageType: MessageType.SYSTEM,
          content: {
            contains: "**✅ ACCEPTED by"
          }
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (donorCallRequestMessage) {
        // This was a donor-requested call, update the message
        await this.prisma.message.update({
          where: { id: donorCallRequestMessage.id },
          data: {
            content: "Call ended",
            updatedAt: new Date(),
          },
        });
      } else {
        // Not a donor-requested call, handle normally
        // Find the existing call started message
        const existingCallMessage = await this.prisma.message.findFirst({
          where: {
            callSessionId: callSession.id,
            messageType: MessageType.CALL_STARTED,
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        if (existingCallMessage) {
          // Update the existing message
          await this.prisma.message.update({
            where: { id: existingCallMessage.id },
            data: {
              content: 'Call ended',
              messageType: MessageType.CALL_ENDED,
              updatedAt: new Date(),
            },
          });
        } else {
          // Fallback: Create a new message if no existing one is found
          await this.messagesService.create({
            queryId: callSession.queryId,
            senderId: adminId ?? undefined,
            content: 'Call ended',
            messageType: MessageType.CALL_ENDED,
            roomName,
            callSessionId: callSession.id,
          });
        }
      }

      // Delete the room in Daily.co
      await this.deleteRoom(roomName);

      return callSession;
    } catch (error) {
      this.logger.error('Error ending call:', error);
      throw error;
    }
  }

  /**
   * End a call by a donor, verifying that the donor is authorized to end this call
   */
  async endCallByDonor(roomName: string, donorId: string) {
    if (!this.isInitialized) {
      throw new Error('Daily.co API not initialized');
    }

    try {
      // First get the call session to verify the donor is authorized
      const callSession = await this.prisma.callSession.findUnique({
        where: { roomName },
        include: {
          query: true,
        },
      });

      if (!callSession) {
        throw new Error(`Call session with room name ${roomName} not found`);
      }

      // Check if the donor is authorized to end this call
      if (callSession.query.donorId !== donorId) {
        throw new Error('You are not authorized to end this call');
      }

      // Update the call session status
      const updatedCallSession = await this.prisma.callSession.update({
        where: { roomName },
        data: {
          status: CallStatus.ENDED,
          endedAt: new Date(),
        },
        include: {
          query: true,
        },
      });

      // Find the existing call started message
      const existingCallMessage = await this.prisma.message.findFirst({
        where: {
          callSessionId: callSession.id,
          messageType: MessageType.CALL_STARTED,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (existingCallMessage) {
        // Update the existing message
        await this.prisma.message.update({
          where: { id: existingCallMessage.id },
          data: {
            content: 'Call ended by donor',
            messageType: MessageType.CALL_ENDED,
            updatedAt: new Date(),
          },
        });
      } else {
        // Fallback: Create a new message if no existing one is found
        await this.messagesService.create({
          queryId: callSession.queryId,
          content: 'Call ended by donor',
          messageType: MessageType.CALL_ENDED,
          roomName,
          callSessionId: callSession.id,
          senderType: SenderType.DONOR
        });
      }

      // Delete the room in Daily.co
      await this.deleteRoom(roomName);

      return updatedCallSession;
    } catch (error) {
      this.logger.error('Error ending call by donor:', error);
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
        senderId: callSession.adminId ?? undefined,
        content: 'Admin joined the call',
        messageType: MessageType.SYSTEM,
        roomName,
        callSessionId: callSession.id,
      });
    }

    return callSession;
  }

  private async createPrivateRoom(
    options: {
      expiryMinutes?: number;
      customRoomName?: string;
    } = {},
  ) {
    if (!this.isInitialized) {
      throw new Error('Daily.co API not initialized');
    }

    try {
      const url = 'https://api.daily.co/v1/rooms';
      const {
        expiryMinutes = 60,
        customRoomName,
      } = options;

      this.logger.log(
        `Creating private room with expiryMinutes: ${expiryMinutes}`,
      );

      const roomConfig = {
        properties: {
          max_participants: 2,
          enable_screenshare: true,
          enable_chat: true,
          start_video_off: false,
          start_audio_off: false,
          exp: Math.floor(Date.now() / 1000) + 60 * 60, // Token expires in 1 hour
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

  private async createMeetingToken(
    roomName: string,
    isAdmin: boolean = false,
  ) {
    if (!this.isInitialized) {
      throw new Error('Daily.co API not initialized');
    }

    try {
      const url = 'https://api.daily.co/v1/meeting-tokens';
      this.logger.log(
        `Creating meeting token for room: ${roomName}, isAdmin: ${isAdmin}`,
      );

      const tokenConfig = {
        properties: {
          room_name: roomName,
          is_owner: isAdmin,
          enable_screenshare: true,
          start_video_off: false,
          start_audio_off: false,
          exp: Math.floor(Date.now() / 1000) + 60 * 60, // Token expires in 1 hour
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

      this.logger.log(
        `Meeting token created successfully for room: ${roomName}`,
      );
      return response.data.token as string;
    } catch (error) {
      this.logger.error(
        `Error creating meeting token for room: ${roomName}`,
        error,
      );
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
    // Make sure the domain includes the .daily.co suffix
    if (this.domain && !this.domain.includes('.daily.co')) {
      return `${this.domain}.daily.co`;
    }
    return this.domain;
  }

  // Add the missing methods
  async requestCall(queryId: number) {
    try {
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
          query: {
            connect: { id: queryId },
          },
          message: `Donor requested a call`,
        },
        include: {
          query: true,
        },
      });

      // Create a message linked to the call request
      const message = await this.messagesService.create({
        content: `Donor requested a call`,
        queryId,
        messageType: MessageType.SYSTEM,
        callRequestId: callRequest.id,
      });

      // If there's an assigned admin, send them a notification
      if (query.assignedToUser) {
        // Send push notification if FCM token is available
        if (query.assignedToUser.fcmToken) {
          await this.notificationsService.sendNotification(
            query.assignedToUser.fcmToken,
            {
              notification: {
                title: 'Call Request',
                body: `Donor requested a call for query #${queryId}`,
              },
              data: {
                type: 'call_request',
                queryId: queryId.toString(),
                callRequestId: callRequest.id.toString(),
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
        
        // Send email notification to the assigned admin
        await this.emailService.sendCallRequestNotification(
          queryId,
          query.assignedToUser.id,
          callRequest.message || undefined
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

  async startDirectCall(queryId: number, callType: string = 'video') {
    try {
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

      // Get admin ID if one is assigned, but don't require it
      let adminId: number | null = null;
      if (query.assignedToUser) {
        adminId = query.assignedToUser.id;
      }

      // Check if there are any active calls for this query
      const existingActiveCalls = await this.prisma.callSession.findMany({
        where: {
          queryId,
          status: {
            in: [CallStatus.CREATED, CallStatus.STARTED],
          },
        },
      });

      // If there's an active call, return it instead of creating a new one
      if (existingActiveCalls.length > 0) {
        const activeCall = existingActiveCalls[0];
        return {
          callSession: activeCall,
          room: {
            name: activeCall.roomName,
          },
          tokens: {
            admin: activeCall.adminToken,
            user: activeCall.userToken,
          },
          notificationData: {
            fcmToken: query.fcmToken,
            adminName: query.assignedToUser?.name
          }
        };
      }

      // Create a room in Daily.co
      const room = await this.createPrivateRoom();

      // Generate tokens
      const adminToken = await this.createMeetingToken(
        room.name,
        true,
      );
      const userToken = await this.createMeetingToken(
        room.name,
        false,
      );

      // Create call session in database with tokens - handle case where no admin is assigned yet
      let callSessionData: any = {
        roomName: room.name,
        status: CallStatus.CREATED,
        userToken: userToken,
        adminToken: adminToken,
        callType: callType, // Store the call type
        query: {
          connect: { id: queryId },
        }
      };
      
      // Only connect to admin if one is assigned
      if (adminId) {
        callSessionData.admin = {
          connect: { id: adminId }
        };
      }
      
      let callSession = await this.prisma.callSession.create({
        data: callSessionData,
        include: {
          query: true,
          admin: true,
        },
      });

      // Create a call started message in the same format as admin-initiated calls
      const capitalizedCallType = callType.charAt(0).toUpperCase() + callType.slice(1);
      await this.messagesService.create({
        content: `${capitalizedCallType} call started by donor`,
        queryId,
        messageType: MessageType.CALL_STARTED, // Use CALL_STARTED instead of SYSTEM
        roomName: room.name,
        callSessionId: callSession.id,
        userToken: userToken,
        adminToken: adminToken,
        senderType: SenderType.DONOR, // Specify that a donor started this call
      });

      // Send notification to the admin if FCM token is available
      if (query.assignedToUser && query.assignedToUser.fcmToken) {
        await this.notificationsService.sendNotification(
          query.assignedToUser.fcmToken,
          {
            notification: {
              title: `Direct ${capitalizedCallType} Call Started`,
              body: `Donor started a ${callType} call for query #${queryId}`,
            },
            data: {
              type: 'direct_call_started',
              queryId: queryId.toString(),
              callSessionId: callSession.id.toString(),
              callType: callType,
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
      
      // Send email notification to the assigned admin
      if (adminId) {
        await this.emailService.sendDirectCallStartedNotification(
          queryId,
          adminId,
          callType
        );
      }

      return {
        callSession,
        room,
        tokens: {
          admin: adminToken,
          user: userToken,
        },
        notificationData: {
          fcmToken: query.fcmToken,
          adminName: query.assignedToUser?.name
        }
      };
    } catch (error) {
      this.logger.error('Error starting direct call:', error);
      throw error;
    }
  }

  async validateAdminAccess(
    queryId: number,
    adminId: number,
  ): Promise<boolean> {
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
        this.logger.warn(
          `Admin ${adminId} is not assigned to query ${queryId}`,
        );
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error(
        `Error validating admin access: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  async acceptCallRequest(
    queryId: number,
    adminId: number,
    callRequestId?: number,
    callType: string = 'video',
  ) {
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
            queryId: queryId, // Ensure it belongs to the specified query
          },
          include: {
            query: true,
          },
        });

        if (!callRequest) {
          throw new Error(
            `Call request with ID ${callRequestId} not found for query ${queryId}`,
          );
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

      // Start the call using the requested call type
      const result = await this.startCall(queryId, adminId, callType);

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
        const capitalizedCallType = callType.charAt(0).toUpperCase() + callType.slice(1);
        const updatedContent = `${originalMessage.content}\n\n**✅ ACCEPTED by ${admin.name}**\n\n**Join the ${callType} call:** [Click here to join the call](${roomUrl})`;

        await this.prisma.message.update({
          where: { id: originalMessage.id },
          data: {
            content: updatedContent,
            roomName: result.room.name,
            callSessionId: result.callSession.id,
            userToken: result.tokens.user,
            adminToken: result.tokens.admin,
            updatedAt: new Date(),
          },
        });
      } else {
        // If for some reason the original message doesn't exist, create a new one
        const capitalizedCallType = callType.charAt(0).toUpperCase() + callType.slice(1);
        await this.messagesService.create({
          content: `Call request accepted by ${admin.name}. Join the ${callType} call: https://${this.getDomain()}/${result.room.name}`,
          queryId,
          senderId: adminId,
          messageType: MessageType.SYSTEM,
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

  async createCallStartedMessage(
    queryId: number,
    adminId: number,
    callSession: CallSession,
    callType: string = 'video',
  ) {
    try {
      const admin = await this.prisma.user.findUnique({
        where: { id: adminId },
      });

      if (!admin) {
        throw new Error(`Admin with ID ${adminId} not found`);
      }

      const capitalizedCallType = callType.charAt(0).toUpperCase() + callType.slice(1);
      
      // Create a system message to record the call
      const message = await this.messagesService.create({
        queryId: queryId,
        senderId: adminId,
        senderType: SenderType.SYSTEM,
        content: `${capitalizedCallType} Call Started by ${admin.name}`,
        messageType: MessageType.CALL_STARTED,
        callSessionId: callSession.id,
      });

      return message;
    } catch (error) {
      this.logger.error('Error creating call started message:', error);
      throw error;
    }
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
      this.logger.error(
        `Error getting call session by ID: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * End all active calls for a specific query
   * Used when resolving or transferring a query
   */
  async endAllActiveCallsForQuery(queryId: number) {
    try {
      this.logger.log(`Ending all active calls for query ID ${queryId}`);

      // Find all active call sessions for this query
      const activeCalls = await this.prisma.callSession.findMany({
        where: {
          queryId,
          status: {
            in: [CallStatus.CREATED, CallStatus.STARTED],
          },
        },
      });

      this.logger.log(
        `Found ${activeCalls.length} active calls to end for query ${queryId}`,
      );

      // End each active call
      for (const call of activeCalls) {
        await this.prisma.callSession.update({
          where: { id: call.id },
          data: {
            status: CallStatus.ENDED,
            endedAt: new Date(),
          },
        });

        // Find the existing call started message
        const existingCallMessage = await this.prisma.message.findFirst({
          where: {
            callSessionId: call.id,
            messageType: MessageType.CALL_STARTED,
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        if (existingCallMessage) {
          // Update the existing message
          await this.prisma.message.update({
            where: { id: existingCallMessage.id },
            data: {
              content: 'Call ended (query was resolved or transferred)',
              messageType: MessageType.CALL_ENDED,
              updatedAt: new Date(),
            },
          });
        } else {
          // Fallback: Create a new message if no existing one is found
          await this.messagesService.create({
            queryId: call.queryId,
            senderId: call.adminId ?? undefined,
            content: 'Call ended (query was resolved or transferred)',
            messageType: MessageType.CALL_ENDED,
            roomName: call.roomName,
            callSessionId: call.id,
            senderType: SenderType.SYSTEM,
          });
        }

        // Delete the room in Daily.co
        try {
          await this.deleteRoom(call.roomName);
        } catch (error) {
          this.logger.error(
            `Failed to delete room ${call.roomName} for resolved/transferred query:`,
            error,
          );
        }
      }

      return activeCalls.length;
    } catch (error) {
      this.logger.error(`Error ending calls for query ${queryId}:`, error);
      throw error;
    }
  }
}