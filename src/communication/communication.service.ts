import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import * as jwt from 'jsonwebtoken';
import { AxiosError } from 'axios';
import { PrismaService } from '../database/prisma.service';
import { CallMode } from '@prisma/client';

// Re-export CallMode enum
export { CallMode };

@Injectable()
export class CommunicationService implements OnModuleInit {
  private readonly logger = new Logger(CommunicationService.name);
  private apiKey!: string;
  private domain!: string;
  private isInitialized = false;

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
    private prisma: PrismaService,
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

  async createPrivateRoom(options: {
    expiryMinutes?: number;
    customRoomName?: string;
    mode?: CallMode;
  } = {}) {
    if (!this.isInitialized) {
      throw new Error('Daily.co API not initialized. Check your environment variables.');
    }

    try {
      const url = 'https://api.daily.co/v1/rooms';
      const { expiryMinutes = 60, customRoomName, mode = CallMode.VIDEO } = options;

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

  async createMeetingToken(roomName: string, isAdmin: boolean = false, mode: CallMode = CallMode.VIDEO) {
    if (!this.isInitialized) {
      throw new Error('Daily.co API not initialized. Check your environment variables.');
    }

    try {
      const url = `https://api.daily.co/v1/meeting-tokens`;
      this.logger.log(`Creating meeting token for room: ${roomName}, isAdmin: ${isAdmin}, mode: ${mode}`);

      const tokenConfig = {
        properties: {
          room_name: roomName,
          is_owner: isAdmin,
          enable_screenshare: true,
          start_video_off: mode === CallMode.AUDIO,
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

      this.logger.log(`Meeting token created successfully for room: ${roomName}`);
      return response.data.token;
    } catch (error) {
      this.handleDailyApiError(error, `Error creating meeting token for room: ${roomName}`);
      throw error;
    }
  }

  async deleteRoom(roomName: string) {
    if (!this.isInitialized) {
      throw new Error('Daily.co API not initialized. Check your environment variables.');
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
      this.handleDailyApiError(error, `Error deleting room: ${roomName}`);
      throw error;
    }
  }

  async listAllRooms() {
    if (!this.isInitialized) {
      throw new Error('Daily.co API not initialized. Check your environment variables.');
    }

    try {
      const url = 'https://api.daily.co/v1/rooms';
      this.logger.log('Listing all rooms');

      const response = await lastValueFrom(
        this.httpService.get(url, {
          headers: { Authorization: `Bearer ${this.apiKey}` },
        }),
      );

      this.logger.log(`Retrieved ${response.data.data.length} rooms`);
      return response.data;
    } catch (error) {
      this.handleDailyApiError(error, 'Error listing rooms');
      throw error;
    }
  }

  async deleteAllRooms() {
    if (!this.isInitialized) {
      throw new Error('Daily.co API not initialized. Check your environment variables.');
    }

    try {
      // First, get all rooms
      const rooms = await this.listAllRooms();
      
      if (!rooms || !rooms.data || !Array.isArray(rooms.data)) {
        throw new Error('Failed to retrieve rooms list');
      }
      
      this.logger.log(`Deleting ${rooms.data.length} rooms`);
      
      // Delete each room
      const deletePromises = rooms.data.map(room => this.deleteRoom(room.name));
      await Promise.all(deletePromises);
      
      this.logger.log('All rooms deleted successfully');
      return { deletedCount: rooms.data.length };
    } catch (error) {
      this.handleDailyApiError(error, 'Error deleting all rooms');
      throw error;
    }
  }

  async requestCall(
    queryId: number,
    adminId: number,
    mode: CallMode,
    message?: string,
  ) {
    try {
      // Check if the query exists
      const query = await this.prisma.donorQuery.findUnique({
        where: { id: queryId },
      });

      if (!query) {
        throw new Error('Query not found');
      }

      // Check if the admin exists
      const admin = await this.prisma.user.findUnique({
        where: { id: adminId },
      });

      if (!admin) {
        throw new Error('Admin not found');
      }

      // Create a call request in the database
      const callRequest = await this.prisma.callRequest.create({
        data: {
          queryId,
          adminId,
          mode,
          message,
          status: 'PENDING',
        },
      });

      // Create a notification for the call request
      await this.prisma.notification.create({
        data: {
          userId: adminId,
          message: `Call request (${mode}) for query #${queryId} has been sent to ${query.donor}`,
          queryId,
        },
      });

      return callRequest;
    } catch (error) {
      this.logger.error('Error creating call request:', error);
      throw error;
    }
  }

  async getCallRequestHistory(queryId: number) {
    return this.prisma.callRequest.findMany({
      where: {
        queryId,
      },
      include: {
        admin: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async updateCallRequest(requestId: number, status: string) {
    return this.prisma.callRequest.update({
      where: {
        id: requestId,
      },
      data: {
        status,
        updatedAt: new Date(),
      },
      include: {
        admin: true,
      },
    });
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
} 