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
  Get,
  HttpException,
  Put,
} from '@nestjs/common';
import { CommunicationService, CallMode } from './communication.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationsService } from '../notifications/notifications.service';
import { Public } from '../auth/public.decorator';

interface CreateCallDto {
  userId: number;
  customRoomName?: string;
  expiryMinutes?: number;
  mode: string; // Changed from CallMode to string for easier JSON parsing
  recipientToken?: string; // Optional FCM token for the recipient
  callerName?: string; // Optional name of the caller
}

interface TestNotificationDto {
  token: string;
  title?: string;
  body?: string;
}

/**
 * Communication endpoints for video calls, audio calls, and messaging
 * Base URL: http://localhost:5002/proof-concierge-backend/api/v1/communication
 * 
 * Testing Instructions:
 * 1. Video Call:
 * curl -X POST http://localhost:5002/proof-concierge-backend/api/v1/communication/call \
 *   -H "Content-Type: application/json" \
 *   -d '{
 *     "userId": 123,
 *     "mode": "video",
 *     "expiryMinutes": 60,
 *     "recipientToken": "RECIPIENT_FCM_TOKEN",
 *     "callerName": "John Doe"
 *   }'
 * 
 * 2. Audio Call:
 * curl -X POST http://localhost:5002/proof-concierge-backend/api/v1/communication/call \
 *   -H "Content-Type: application/json" \
 *   -d '{
 *     "userId": 123,
 *     "mode": "audio",
 *     "expiryMinutes": 60,
 *     "recipientToken": "RECIPIENT_FCM_TOKEN",
 *     "callerName": "John Doe"
 *   }'
 * 
 * 3. Test Endpoint:
 * curl http://localhost:5002/proof-concierge-backend/api/v1/communication/test
 * 
 * 4. Generate Test FCM Token:
 * curl http://localhost:5002/proof-concierge-backend/api/v1/communication/test-token
 * 
 * 5. Test FCM Notification:
 * curl -X POST http://localhost:5002/proof-concierge-backend/api/v1/communication/test-notification \
 *   -H "Content-Type: application/json" \
 *   -d '{
 *     "token": "RECIPIENT_FCM_TOKEN",
 *     "title": "Test Notification",
 *     "body": "This is a test notification"
 *   }'
 * 
 * Note: For FCM notifications to work, you need to use a valid FCM token from a real device.
 * Test tokens like "test-fcm-token" will not work. Use the test-token endpoint to generate
 * a valid-looking test token for testing the validation logic.
 */
@Controller({
  path: 'communication',
  version: '1'
})
export class CommunicationController {
  private readonly logger = new Logger(CommunicationController.name);

  constructor(
    private communicationService: CommunicationService,
    private notificationsService: NotificationsService,
  ) {}

  @Get('test')
  async testEndpoint() {
    this.logger.log('Test endpoint called');
    return {
      status: 'success',
      message: 'API is working correctly',
      timestamp: new Date().toISOString(),
    };
  }

  @Post('test-notification')
  async testNotification(@Body() testNotificationDto: TestNotificationDto) {
    this.logger.log('Test notification endpoint called with data:', testNotificationDto);
    
    try {
      // Validate the FCM token format
      const token = testNotificationDto.token;
      
      // Check if this is a test token
      if (token === 'test-fcm-token' || token === 'RECIPIENT_FCM_TOKEN' || !token || token.length < 20) {
        this.logger.warn('Invalid FCM token format detected:', token);
        return {
          status: 'error',
          message: 'Invalid FCM token format. Please use a valid FCM registration token from a real device or Firebase console.',
          details: 'FCM tokens are typically long strings (140+ characters). Test tokens like "test-fcm-token" will not work.',
          helpText: 'To get a valid FCM token, you need to register a real device with Firebase or use the Firebase console to generate a valid token.',
          timestamp: new Date().toISOString(),
        };
      }
      
      const result = await this.notificationsService.sendNotification(
        token,
        {
          notification: {
            title: testNotificationDto.title || 'Test Notification',
            body: testNotificationDto.body || 'This is a test notification',
          },
          data: {
            timestamp: Date.now().toString(),
            type: 'test',
          },
          android: {
            priority: 'high',
            notification: {
              channelId: 'default',
              priority: 'high',
              sound: 'default',
            },
          },
          apns: {
            payload: {
              aps: {
                sound: 'default',
                category: 'TEST',
                contentAvailable: true,
              },
            },
          },
        }
      );

      return {
        status: result ? 'success' : 'failed',
        message: result ? 'Notification sent successfully' : 'Failed to send notification (FCM may not be configured)',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error sending test notification:', error);
      return {
        status: 'error',
        message: `Failed to send notification: ${error.message}`,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Temporarily removed JwtAuthGuard for testing
  // @UseGuards(JwtAuthGuard)
  @Post('call')
  async createCall(@Request() req: any, @Body() createCallDto: CreateCallDto) {
    this.logger.log('Creating call with data:', createCallDto);
    
    // Convert string mode to CallMode enum
    const callMode = createCallDto.mode === 'audio' ? CallMode.AUDIO : CallMode.VIDEO;
    const isAudioOnly = callMode === CallMode.AUDIO;

    try {
      // Create a private room
      const room = await this.communicationService.createPrivateRoom({
        customRoomName: createCallDto.customRoomName,
        expiryMinutes: createCallDto.expiryMinutes,
        mode: callMode,
      });

      this.logger.log('Room created successfully:', room);

      // Generate tokens for both participants
      const adminToken = await this.communicationService.createMeetingToken(room.name, true, callMode);
      const userToken = await this.communicationService.createMeetingToken(room.name, false, callMode);

      this.logger.log('Tokens generated successfully');

      // Send notification if recipient token is provided
      let notificationSent = false;
      if (createCallDto.recipientToken && createCallDto.callerName) {
        try {
          const recipientToken = createCallDto.recipientToken;
          
          // Validate the FCM token format
          if (recipientToken === 'test-fcm-token' || recipientToken === 'RECIPIENT_FCM_TOKEN' || recipientToken.length < 20) {
            this.logger.warn('Invalid FCM token format detected:', recipientToken);
            // Continue with call creation but log the warning
          } else {
            const notificationResult = await this.notificationsService.sendCallNotification(
              recipientToken,
              createCallDto.callerName,
              room.name,
              callMode === CallMode.AUDIO ? 'audio' : 'video'
            );
            
            notificationSent = !!notificationResult;
            if (notificationSent) {
              this.logger.log('Call notification sent successfully');
            } else {
              this.logger.warn('Call notification was not sent (FCM may not be configured)');
            }
          }
        } catch (notificationError) {
          this.logger.error('Failed to send call notification:', notificationError);
          // Continue with the call creation even if notification fails
        }
      }

      // Return both admin and user tokens for testing
      return {
        status: HttpStatus.CREATED,
        data: {
          admin: {
            roomUrl: room.url,
            roomToken: adminToken,
            roomName: room.name,
            mode: callMode,
          },
          user: {
            roomUrl: room.url,
            roomToken: userToken,
            roomName: room.name,
            mode: callMode,
          },
          notification: {
            sent: notificationSent,
            recipientToken: createCallDto.recipientToken ? '***' : null,
          }
        },
        clientUsage: {
          installation: 'npm install @daily-co/daily-js',
          example: `
import DailyIframe from '@daily-co/daily-js';

// Create and embed the Daily.co iframe
const call = DailyIframe.createFrame({
  url: '${room.url}',
  token: '${adminToken}', // Use adminToken for admin, userToken for user
});

// Join the call
await call.join();

// For screen sharing:
// Start sharing: await call.startScreenShare()
// Stop sharing: await call.stopScreenShare()
          `,
        },
      };
    } catch (error) {
      this.logger.error('Error creating call:', error);
      throw error;
    }
  }

  // Add a delete endpoint for cleaning up rooms
  // @UseGuards(JwtAuthGuard)
  @Delete('call/:roomName')
  async deleteRoom(@Param('roomName') roomName: string) {
    this.logger.log('Deleting room:', roomName);
    try {
      await this.communicationService.deleteRoom(roomName);
      return {
        status: HttpStatus.OK,
        message: `Room ${roomName} deleted successfully`,
      };
    } catch (error) {
      this.logger.error('Error deleting room:', error);
      throw error;
    }
  }

  // Endpoint to delete all rooms
  // @UseGuards(JwtAuthGuard)
  @Delete('rooms')
  async deleteAllRooms() {
    this.logger.log('Deleting all rooms');
    try {
      const result = await this.communicationService.deleteAllRooms();
      return {
        status: HttpStatus.OK,
        message: `${result.deletedCount} rooms deleted successfully`,
        deletedCount: result.deletedCount,
      };
    } catch (error) {
      this.logger.error('Error deleting all rooms:', error);
      throw error;
    }
  }

  // Endpoint to list all rooms
  // @UseGuards(JwtAuthGuard)
  @Get('rooms')
  async listAllRooms() {
    this.logger.log('Listing all rooms');
    try {
      const rooms = await this.communicationService.listAllRooms();
      return {
        status: HttpStatus.OK,
        data: rooms,
      };
    } catch (error) {
      this.logger.error('Error listing rooms:', error);
      throw error;
    }
  }

  @Get('test-token')
  async generateTestToken() {
    this.logger.log('Test token generation endpoint called');
    
    const testToken = this.notificationsService.generateTestFcmToken();
    
    return {
      status: 'success',
      message: 'Test FCM token generated successfully',
      token: testToken,
      note: 'This is a randomly generated token that looks like a valid FCM token, but it will not work with actual Firebase services. It is only for testing the validation logic.',
      usage: {
        curl: `curl -X POST http://localhost:5002/proof-concierge-backend/api/v1/communication/test-notification \\
-H "Content-Type: application/json" \\
-d '{
  "token": "${testToken}",
  "title": "Test Notification",
  "body": "This is a test notification"
}'`,
      },
      timestamp: new Date().toISOString(),
    };
  }
  
  @Get('test-daily')
  async testDailyIntegration() {
    this.logger.log('Testing Daily.co integration');
    
    try {
      // Step 1: Create a room
      const roomName = `test-room-${Date.now()}`;
      const room = await this.communicationService.createPrivateRoom({
        customRoomName: roomName,
        expiryMinutes: 60,
        mode: CallMode.VIDEO,
      });
      
      // Step 2: Create tokens
      const adminToken = await this.communicationService.createMeetingToken(room.name, true, CallMode.VIDEO);
      const userToken = await this.communicationService.createMeetingToken(room.name, false, CallMode.VIDEO);
      
      // Step 3: Return the results
      const result = {
        status: 'success',
        message: 'Daily.co integration test successful',
        room: {
          name: room.name,
          url: room.url,
          created_at: room.created_at,
          config: room.config,
        },
        tokens: {
          admin: adminToken.substring(0, 20) + '...',
          user: userToken.substring(0, 20) + '...',
        },
        usage: {
          join: `Use the room URL with the token to join: ${room.url}?token=TOKEN`,
          cleanup: `To delete this room: curl -X DELETE http://localhost:5002/proof-concierge-backend/api/v1/communication/call/${room.name}`,
        },
        timestamp: new Date().toISOString(),
      };
      
      return result;
    } catch (error) {
      this.logger.error('Error testing Daily.co integration:', error);
      return {
        status: 'error',
        message: 'Daily.co integration test failed',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Post('request-call')
  @UseGuards(JwtAuthGuard)
  async requestCall(
    @Body() requestCallDto: {
      queryId: number;
      mode: CallMode;
      message?: string;
    },
    @Request() req: any,
  ) {
    try {
      const adminId = req.user.id;
      const result = await this.communicationService.requestCall(
        requestCallDto.queryId,
        adminId,
        requestCallDto.mode,
        requestCallDto.message,
      );
      
      return {
        success: true,
        message: `${requestCallDto.mode} call request sent successfully`,
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to request call',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Public()
  @Get(':queryId')
  async getCallRequests(@Param('queryId') queryId: string) {
    try {
      const requests = await this.communicationService.getCallRequestHistory(+queryId);
      return {
        status: HttpStatus.OK,
        data: requests,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to get call requests',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Public()
  @Put(':queryId')
  async updateCallRequest(
    @Param('queryId') queryId: string,
    @Body() updateData: { status: string; callRequestId: number }
  ) {
    try {
      const request = await this.communicationService.updateCallRequest(
        updateData.callRequestId,
        updateData.status
      );
      return {
        status: HttpStatus.OK,
        data: request,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to update call request',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
} 