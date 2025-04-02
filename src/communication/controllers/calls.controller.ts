import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpStatus,
  Logger,
  Delete,
  Param,
  Put,
  HttpException,
  Get,
  ParseIntPipe,
} from '@nestjs/common';
import { CallsService } from '../services/calls.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { CallStatus, UserRole } from '@prisma/client';
import { NotificationsService } from '../../notifications/notifications.service';
import { MessagesService } from '../services/messages.service';
import { PrismaService } from '../../database/prisma.service';
import { Public } from '../../auth/public.decorator';
import { CreateCallRequestDto } from '../dto/create-call-request.dto';
import { StartCallDto } from '../dto/start-call.dto';
import { NotificationsGateway } from 'src/notifications/notifications.gateway';

@Controller({
  path: 'communication/call',
  version: '1'
})
@UseGuards(JwtAuthGuard)
export class CallsController {
  private readonly logger = new Logger(CallsController.name);

  constructor(
    private readonly callsService: CallsService,
    private readonly notificationsService: NotificationsService,
    private readonly messagesService: MessagesService,
    private readonly prisma: PrismaService,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post(':queryId')
  async startCall(
    @Param('queryId', ParseIntPipe) queryId: number,
    @Body() startCallDto: StartCallDto,
    @Request() req: any,
  ) {
    try {
      // Debug: Log the request object to see its structure
      this.logger.debug('Request object in startCall:', JSON.stringify({
        user: req.user,
        headers: req.headers,
        params: req.params,
        body: req.body
      }, null, 2));
      
      // Check if user exists but in a different location
      const adminId = req.user?.id || req.user?.userId || req.userId;
      
      if (!adminId) {
        this.logger.error('Admin ID not found in request. Request structure:', req.user);
        throw new HttpException(
          'Admin ID is required',
          HttpStatus.BAD_REQUEST,
        );
      }
      
      this.logger.log(`Starting call with adminId: ${adminId}, queryId: ${queryId}`);
      
      const result = await this.callsService.startCall(
        queryId,
        adminId,
      );

      // Log the room URL
      const roomUrl = `https://${this.callsService.getDomain()}/${result.room.name}`;
      this.logger.log(`Call room created: ${roomUrl}`);
      
      // Send notification to the user if FCM token is available
      if (result.notificationData?.fcmToken) {
        await this.notificationsService.sendCallNotification(
          result.notificationData.fcmToken,
          result.notificationData.adminName,
          result.room.name,
          'video'
        );
      }

      // Send WebSocket notification about the call being started
      this.notificationsGateway.notifyCallStarted(
        queryId,
        result.callSession,
        adminId
      );

      // Check if the call message was created
      this.logger.log(`Checking for call messages for queryId: ${queryId}`);
      const messages = await this.messagesService.findMessages({
        queryId,
        messageType: 'CALL_STARTED',
        limit: 10
      });
      this.logger.log(`Found ${messages.length} CALL_STARTED messages for queryId: ${queryId}`);
      if (messages.length > 0) {
        this.logger.log(`Latest call message: ${JSON.stringify(messages[0])}`);
      }

      return {
        success: true,
        message: `Call initiated`,
        data: {
          callSession: result.callSession,
          adminToken: result.tokens.admin,
          userToken: result.tokens.user,
          roomUrl: roomUrl,
        },
      };
    } catch (error) {
      this.logger.error('Error starting call:', error);
      throw new HttpException(
        error.message || 'Failed to start call',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post(':roomName/end')
  async endCall(
    @Param('roomName') roomName: string,
    @Request() req: any,
  ) {
    try {
      // Debug: Log the request object to see its structure
      this.logger.debug('Request object in endCall:', JSON.stringify({
        user: req.user,
        headers: req.headers,
        params: req.params
      }, null, 2));
      
      // Check if user exists but in a different location
      const adminId = req.user?.id || req.user?.userId || req.userId;
      
      if (!adminId) {
        this.logger.error('Admin ID not found in request. Request structure:', req.user);
        throw new HttpException(
          'Admin ID is required',
          HttpStatus.BAD_REQUEST,
        );
      }
      
      this.logger.log(`Ending call with adminId: ${adminId}, roomName: ${roomName}`);
      
      const result = await this.callsService.endCall(roomName, adminId);
      return {
        success: true,
        message: 'Call ended successfully',
        data: result,
      };
    } catch (error) {
      this.logger.error('Error ending call:', error);
      throw new HttpException(
        error.message || 'Failed to end call',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':roomName/donor-end')
  @Public()
  async endCallByDonor(
    @Param('roomName') roomName: string,
    @Body() body: { donorId: string },
  ) {
    try {
      if (!body.donorId) {
        throw new HttpException(
          'Donor ID is required',
          HttpStatus.BAD_REQUEST,
        );
      }
      
      this.logger.log(`Ending call by donor with donorId: ${body.donorId}, roomName: ${roomName}`);
      
      const result = await this.callsService.endCallByDonor(roomName, body.donorId);
      return {
        success: true,
        message: 'Call ended successfully by donor',
        data: result,
      };
    } catch (error) {
      this.logger.error('Error ending call by donor:', error);
      throw new HttpException(
        error.message || 'Failed to end call',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':roomName/status')
  async updateCallStatus(
    @Param('roomName') roomName: string,
    @Body() body: { status: CallStatus },
  ) {
    try {
      const result = await this.callsService.updateCallStatus(roomName, body.status);
      return {
        success: true,
        message: `Call status updated to ${body.status}`,
        data: result,
      };
    } catch (error) {
      this.logger.error('Error updating call status:', error);
      throw new HttpException(
        error.message || 'Failed to update call status',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':roomName')
  async deleteRoom(@Param('roomName') roomName: string) {
    this.logger.log('Deleting room:', roomName);
    try {
      await this.callsService.deleteRoom(roomName);
      return {
        status: HttpStatus.OK,
        message: `Room ${roomName} deleted successfully`,
      };
    } catch (error) {
      this.logger.error('Error deleting room:', error);
      throw error;
    }
  }

  @Post(':queryId/request')
  @Public()
  async requestCall(
    @Param('queryId') queryId: string,
    @Body() body: CreateCallRequestDto,
  ) {
    try {
      const result = await this.callsService.requestCall(
        +queryId,
      );

      return {
        success: true,
        message: `Call request sent successfully`,
        data: result,
      };
    } catch (error) {
      this.logger.error('Error requesting call:', error);
      throw new HttpException(
        error.message || 'Failed to request call',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':queryId/direct-call')
  @Public()
  async startDirectCall(
    @Param('queryId') queryId: string,
  ) {
    try {
      const result = await this.callsService.startDirectCall(+queryId);

      // Send WebSocket notification about the direct call being started
      this.notificationsGateway.notifyDirectCallStarted(
        +queryId,
        result.callSession
      );

      return {
        success: true,
        message: `Call started successfully`,
        data: result,
      };
    } catch (error) {
      this.logger.error('Error starting direct call:', error);
      throw new HttpException(
        error.message || 'Failed to start direct call',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':queryId/active-call')
  @Public()
  async getActiveCall(
    @Param('queryId') queryId: string,
  ) {
    try {
      const calls = await this.callsService.getCallsForQuery(+queryId);
      
      // Filter for active calls only
      const activeCalls = calls.filter(call => 
        call.status === CallStatus.CREATED || call.status === CallStatus.STARTED
      );
      
      if (activeCalls.length === 0) {
        return {
          success: false,
          message: 'No active call found for this query',
          data: null,
        };
      }
      
      // Return the most recent active call
      const activeCall = activeCalls[0];
      const roomUrl = `https://${this.callsService.getDomain()}/${activeCall.roomName}`;
      
      return {
        success: true,
        message: 'Active call found',
        data: {
          callSession: activeCall,
          roomUrl,
          userToken: activeCall.userToken,
        },
      };
    } catch (error) {
      this.logger.error('Error getting active call:', error);
      throw new HttpException(
        error.message || 'Failed to get active call',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get(':queryId/requests')
  async getPendingCallRequests(
    @Param('queryId') queryId: string,
    @Request() req: any,
  ) {
    try {
      const adminId = req.user?.id || req.user?.userId || req.userId;
      
      if (!adminId) {
        this.logger.error('Admin ID not found in request. Request structure:', req.user);
        throw new HttpException(
          'Admin ID is required',
          HttpStatus.BAD_REQUEST,
        );
      }
      
      // Check if the admin is assigned to this query
      const query = await this.callsService.validateAdminAccess(+queryId, adminId);
      if (!query) {
        throw new HttpException(
          'You are not authorized to view call requests for this query',
          HttpStatus.FORBIDDEN,
        );
      }
      
      const callRequests = await this.callsService.getCallRequests(+queryId);
      
      return {
        success: true,
        message: 'Call requests retrieved successfully',
        data: callRequests,
      };
    } catch (error) {
      this.logger.error('Error getting call requests:', error);
      throw new HttpException(
        error.message || 'Failed to get call requests',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post(':queryId/accept-request')
  async acceptCallRequestWithoutId(
    @Param('queryId') queryId: string,
    @Request() req: any,
  ) {
    return this.handleAcceptCallRequest(queryId, req);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post(':queryId/accept-request/:requestId')
  async acceptCallRequestWithId(
    @Param('queryId') queryId: string,
    @Param('requestId') requestId: string,
    @Request() req: any,
  ) {
    return this.handleAcceptCallRequest(queryId, req, requestId);
  }

  private async handleAcceptCallRequest(
    queryId: string,
    req: any,
    requestId?: string,
  ) {
    try {
      // Debug: Log the request object to see its structure
      this.logger.debug('Request object in acceptCallRequest:', JSON.stringify({
        user: req.user,
        headers: req.headers,
        params: req.params
      }, null, 2));
      
      // Check if user exists but in a different location
      const adminId = req.user?.id || req.user?.userId || req.userId;
      
      if (!adminId) {
        this.logger.error('Admin ID not found in request. Request structure:', req.user);
        throw new HttpException(
          'Admin ID is required',
          HttpStatus.BAD_REQUEST,
        );
      }
      
      this.logger.log(`Accepting call request with adminId: ${adminId}, queryId: ${queryId}${requestId ? `, requestId: ${requestId}` : ''}`);
      
      // First check if the admin is assigned to this query
      const query = await this.callsService.validateAdminAccess(+queryId, adminId);
      if (!query) {
        throw new HttpException(
          'You are not authorized to accept this call request',
          HttpStatus.FORBIDDEN,
        );
      }

      try {
        // Call acceptCallRequest with or without requestId
        const result = await this.callsService.acceptCallRequest(
          +queryId,
          adminId,
          requestId ? +requestId : undefined
        );

        // Log the room URL
        const roomUrl = result.room.url || `https://${this.callsService.getDomain()}/${result.room.name}`;
        this.logger.log(`Call room created: ${roomUrl}`);

        // Send WebSocket notification about the call being started
        this.notificationsGateway.notifyCallStarted(
          +queryId,
          result.callSession,
          adminId
        );

        return {
          success: true,
          message: `Call request accepted and call initiated`,
          data: {
            ...result,
            roomUrl: roomUrl, // Include the room URL in the response
          },
        };
      } catch (error) {
        // Check if this is the specific error about an existing active call
        if (error.message && error.message.includes('There is already an active call for this query')) {
          // Find the existing active call
          const existingCalls = await this.prisma.callSession.findMany({
            where: { 
              queryId: +queryId,
              status: {
                in: ['CREATED', 'STARTED']
              }
            },
            orderBy: { createdAt: 'desc' },
            include: {
              admin: {
                select: {
                  id: true,
                  name: true,
                  role: true,
                },
              },
            },
            take: 1
          });
          
          if (existingCalls.length > 0) {
            const existingCall = existingCalls[0];
            const roomUrl = `https://${this.callsService.getDomain()}/${existingCall.roomName}`;
            
            return {
              success: false,
              message: `There is already an active call for this query. You can join the existing call.`,
              data: {
                existingCall,
                roomUrl: roomUrl,
              },
            };
          }
        }
        
        // Re-throw the error if it's not about an existing call or if we couldn't find the existing call
        throw error;
      }
    } catch (error) {
      this.logger.error('Error accepting call request:', error);
      throw new HttpException(
        error.message || 'Failed to accept call request',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post(':queryId/reject-request/:requestId')
  async rejectCallRequest(
    @Param('queryId') queryId: string,
    @Param('requestId') requestId: string,
    @Request() req: any,
  ) {
    try {
      const adminId = req.user?.id || req.user?.userId || req.userId;
      
      if (!adminId) {
        throw new HttpException(
          'Admin ID is required',
          HttpStatus.BAD_REQUEST,
        );
      }
      
      // Check if admin is assigned to this query
      const query = await this.callsService.validateAdminAccess(+queryId, adminId);
      if (!query) {
        throw new HttpException(
          'You are not authorized to reject this call request',
          HttpStatus.FORBIDDEN,
        );
      }

      const result = await this.callsService.rejectCallRequest(
        +requestId,
        adminId,
      );

      return {
        success: true,
        message: `Call request rejected`,
        data: result,
      };
    } catch (error) {
      this.logger.error('Error rejecting call request:', error);
      throw new HttpException(
        error.message || 'Failed to reject call request',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('calls/:queryId')
  async getCallDetailsByQueryId(@Param('queryId') queryId: string) {
    try {
      this.logger.log(`Getting calls for queryId: ${queryId}`);
      
      // Get call sessions for this query
      const callSessions = await this.prisma.callSession.findMany({
        where: { queryId: +queryId },
        orderBy: { createdAt: 'desc' },
        include: {
          admin: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
        },
      });
      
      // Get call-related messages
      const messages = await this.messagesService.findCallMessages(+queryId);
      
      return {
        success: true,
        data: {
          callSessions,
          messages,
        },
      };
    } catch (error) {
      this.logger.error('Error getting calls for query:', error);
      throw new HttpException(
        error.message || 'Failed to get calls',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
} 