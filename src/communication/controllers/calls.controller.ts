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
import { CallMode, CallStatus, UserRole } from '@prisma/client';
import { NotificationsService } from '../../notifications/notifications.service';
import { MessagesService } from '../services/messages.service';
import { PrismaService } from '../../database/prisma.service';
import { StartCallDto } from '../dto/start-call.dto';
import { Public } from 'src/auth/public.decorator';

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
      
      // Ensure we're passing a valid CallMode enum value
      let callMode = startCallDto.mode || CallMode.VIDEO;
      
      // Check if user exists but in a different location
      const adminId = req.user?.id || req.user?.userId || req.userId;
      
      if (!adminId) {
        this.logger.error('Admin ID not found in request. Request structure:', req.user);
        throw new HttpException(
          'Admin ID is required',
          HttpStatus.BAD_REQUEST,
        );
      }
      
      this.logger.log(`Starting call with adminId: ${adminId}, queryId: ${queryId}, mode: ${callMode}`);
      
      const result = await this.callsService.startCall(
        queryId,
        adminId,
        callMode,
      );

      // Log the room URL
      const roomUrl = result.room.url || `https://${this.callsService.getDomain()}/${result.room.name}`;
      this.logger.log(`Call room created: ${roomUrl}`);
      
      // Send notification to the user if FCM token is available
      if (result.callSession.query.fcmToken) {
        await this.notificationsService.sendCallNotification(
          result.callSession.query.fcmToken,
          result.callSession.admin.name,
          result.room.name,
          result.callSession.mode === CallMode.AUDIO ? 'audio' : 'video'
        );
      }

      return {
        success: true,
        message: `${result.callSession.mode} call initiated`,
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
    @Body() body: { mode?: CallMode },
  ) {
    try {
      // Ensure we're passing a valid CallMode enum value
      let callMode = body.mode || CallMode.VIDEO;
      
      const result = await this.callsService.requestCall(
        +queryId,
        callMode,
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

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post(':queryId/accept-request')
  async acceptCallRequest(
    @Param('queryId') queryId: string,
    @Request() req: any,
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
      
      this.logger.log(`Accepting call request with adminId: ${adminId}, queryId: ${queryId}`);
      
      // First check if the admin is assigned to this query
      const query = await this.callsService.validateAdminAccess(+queryId, adminId);
      if (!query) {
        throw new HttpException(
          'You are not authorized to accept this call request',
          HttpStatus.FORBIDDEN,
        );
      }

      const result = await this.callsService.acceptCallRequest(
        +queryId,
        adminId,
      );

      // Log the room URL
      const roomUrl = result.room.url || `https://${this.callsService.getDomain()}/${result.room.name}`;
      this.logger.log(`Call room created: ${roomUrl}`);

      return {
        success: true,
        message: `Call request accepted and call initiated`,
        data: {
          ...result,
          roomUrl: roomUrl, // Include the room URL in the response
        },
      };
    } catch (error) {
      this.logger.error('Error accepting call request:', error);
      throw new HttpException(
        error.message || 'Failed to accept call request',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('calls/:queryId')
  async getCallsForQuery(@Param('queryId') queryId: string) {
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