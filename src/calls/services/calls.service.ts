import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateCallDto } from '../dto/create-call.dto';
import { UpdateCallDto } from '../dto/update-call.dto';
import { Call, CallStatus } from '../entities/call.entity';
import { TextMessagesGateway } from '../../text-messages/text-messages.gateway';
import axios from 'axios';

@Injectable()
export class CallsService {
  constructor(
    private prisma: PrismaService,
    private textMessagesGateway: TextMessagesGateway
  ) {}

  // Create a Daily.js room and return the room details with tokens
  private async createDailyRoom(callType: string): Promise<{ url: string, userToken: string, adminToken: string }> {
    try {
      // Replace this URL with the actual Daily.js API endpoint
      const dailyApiUrl = 'https://api.daily.co/v1/rooms';
      
      // Get API key from environment variables
      const dailyApiKey = process.env.DAILY_API_KEY;
      
      // Generate a room name with timestamp to ensure uniqueness
      const roomName = `room-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      
      // Create room with configured settings
      const roomResponse = await axios.post(
        dailyApiUrl,
        {
          name: roomName,
          properties: {
            enable_chat: true,
            enable_screenshare: true,
            enable_recording: false,
            start_audio_off: callType === 'video' ? false : true,
            start_video_off: callType === 'video' ? false : true,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${dailyApiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );
      
      // Create tokens for donor (user) and admin with appropriate permissions
      const userTokenResponse = await axios.post(
        `https://api.daily.co/v1/meeting-tokens`,
        {
          properties: {
            room_name: roomName,
            is_owner: false,
            user_name: 'Donor',
            start_audio_off: callType === 'video' ? false : true,
            start_video_off: callType === 'video' ? false : true
          }
        },
        {
          headers: {
            Authorization: `Bearer ${dailyApiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      const adminTokenResponse = await axios.post(
        `https://api.daily.co/v1/meeting-tokens`,
        {
          properties: {
            room_name: roomName,
            is_owner: true,
            user_name: 'Admin',
            start_audio_off: callType === 'video' ? false : true,
            start_video_off: callType === 'video' ? false : true
          }
        },
        {
          headers: {
            Authorization: `Bearer ${dailyApiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      return {
        url: roomResponse.data.url,
        userToken: userTokenResponse.data.token,
        adminToken: adminTokenResponse.data.token
      };
    } catch (error) {
      console.error('Error creating Daily room:', error);
      throw new Error('Failed to create call room');
    }
  }

  async create(createCallDto: CreateCallDto): Promise<Call> {
    // Create a Daily.js room with tokens
    const { url: dailyRoomUrl, userToken, adminToken } = await this.createDailyRoom(createCallDto.callType);
    
    // Start a transaction to ensure both the call and ticket update happen together
    const call = await this.prisma.$transaction(async (tx) => {
      // Create the call record
      const call = await tx.call.create({
        data: {
          ticketId: createCallDto.ticketId,
          dailyRoomUrl,
          userToken,
          adminToken,
          status: CallStatus.ACTIVE,
          callType: createCallDto.callType,
          initiatedBy: createCallDto.initiatedBy,
          startedAt: new Date(),
        },
      });
      
      // Update the ticket to reflect active call
      await tx.ticket.update({
        where: { id: createCallDto.ticketId },
        data: {
          activeCallId: call.id,
          status: 'active_call',
        },
      });
      
      return call;
    }) as unknown as Call;
    
    // Emit WebSocket event for call started
    this.textMessagesGateway.notifyCallStarted(createCallDto.ticketId, call);
    
    return call;
  }
  
  async findAll(): Promise<Call[]> {
    return this.prisma.call.findMany({
      orderBy: { createdAt: 'desc' },
    }) as unknown as Call[];
  }
  
  async findOne(id: string): Promise<Call> {
    const call = await this.prisma.call.findUnique({
      where: { id },
    });
    
    if (!call) {
      throw new NotFoundException(`Call with ID ${id} not found`);
    }
    
    return call as unknown as Call;
  }
  
  async update(id: string, updateCallDto: UpdateCallDto): Promise<Call> {
    const call = await this.prisma.call.findUnique({
      where: { id },
      include: { ticket: true },
    });
    
    if (!call) {
      throw new NotFoundException(`Call with ID ${id} not found`);
    }
    
    if (updateCallDto.status === CallStatus.ENDED) {
      // If call is ending, update in a transaction
      const updatedCall = await this.prisma.$transaction(async (tx) => {
        // Update the call
        const updatedCall = await tx.call.update({
          where: { id },
          data: {
            status: CallStatus.ENDED,
            endedAt: new Date(),
          },
        });
        
        // Update the ticket
        await tx.ticket.update({
          where: { id: call.ticketId },
          data: {
            activeCallId: null,
            status: 'pending', // Reset to pending after call ends
          },
        });
        
        return updatedCall;
      }) as unknown as Call;
      
      // Emit WebSocket event for call ended
      this.textMessagesGateway.notifyCallEnded(call.ticketId, id);
      
      return updatedCall;
    } else {
      // For other status updates
      return this.prisma.call.update({
        where: { id },
        data: updateCallDto,
      }) as unknown as Call;
    }
  }
  
  async findByTicket(ticketId: string): Promise<Call[]> {
    return this.prisma.call.findMany({
      where: { ticketId },
      orderBy: { startedAt: 'desc' },
    }) as unknown as Call[];
  }
} 