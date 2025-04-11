import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { UserRole } from '@prisma/client';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService
  ) {}

  /**
   * Validates if a token appears to be a valid notification token
   * @param token The notification token to validate
   * @returns boolean indicating if the token appears valid
   */
  isValidNotificationToken(token: string): boolean {
    // Basic validation for notification tokens
    if (!token || typeof token !== 'string') {
      return false;
    }
    
    // Check for common test tokens
    if (
      token === 'test-token' || 
      token === 'RECIPIENT_TOKEN' || 
      token.length < 10
    ) {
      return false;
    }
    
    // Basic format validation
    const validTokenPattern = /^[a-zA-Z0-9:_\-]+$/;
    return validTokenPattern.test(token);
  }

  /**
   * Send a notification to a specific device
   * @param token Device token
   * @param payload Notification payload
   * @returns Promise with the message ID
   */
  async sendNotification(
    token: string,
    payload: { title: string; body: string; data?: Record<string, string> },
  ) {
    try {
      // Validate the token format
      if (!this.isValidNotificationToken(token)) {
        this.logger.warn(`Invalid notification token format: ${token}`);
        return null;
      }

      this.logger.log(`Sending notification to token: ${token}`);
      this.logger.log(`Notification payload: ${JSON.stringify(payload)}`);
      
      // In a real implementation, you would send the notification here
      // For now, we'll just log it and return a mock success
      return 'mock-notification-id';
    } catch (error) {
      this.logger.error(`Error sending notification: ${error.message}`, error.stack);
      // Don't throw the error, just log it and return null
      return null;
    }
  }

  /**
   * Send a notification to multiple devices
   * @param tokens Array of device tokens
   * @param payload Notification payload
   * @returns Promise with the message IDs
   */
  async sendMulticastNotification(
    tokens: string[],
    payload: { title: string; body: string },
    data?: Record<string, string>,
  ) {
    try {
      // Filter out invalid tokens
      const validTokens = tokens.filter(token => this.isValidNotificationToken(token));
      
      if (validTokens.length === 0) {
        this.logger.warn('No valid notification tokens provided for multicast notification.');
        return null;
      }
      
      if (validTokens.length < tokens.length) {
        this.logger.warn(`Filtered out ${tokens.length - validTokens.length} invalid tokens from multicast notification.`);
      }

      this.logger.log(`Sending multicast notification to ${validTokens.length} devices`);
      this.logger.log(`Notification payload: ${JSON.stringify(payload)}`);
      
      // In a real implementation, you would send the notifications here
      // For now, we'll just log it and return a mock success
      return {
        successCount: validTokens.length,
        failureCount: 0,
        responses: validTokens.map(() => ({ success: true }))
      };
    } catch (error) {
      this.logger.error(`Error sending multicast notification: ${error.message}`, error.stack);
      // Don't throw the error, just log it and return null
      return null;
    }
  }

  /**
   * Send a notification about a new call
   * @param recipientToken Token of the recipient
   * @param callerName Name of the caller
   * @param callId Unique ID for the call
   * @param callType Type of call (video/audio)
   */
  async sendCallNotification(
    recipientToken: string,
    callerName: string,
    callId: string,
    callType: 'video' | 'audio',
  ) {
    try {
      // Validate the token format
      if (!this.isValidNotificationToken(recipientToken)) {
        this.logger.warn(`Invalid notification token format for call notification: ${recipientToken}`);
        return null;
      }

      return this.sendNotification(recipientToken, {
        title: `Incoming ${callType} call`,
        body: `${callerName} is calling you`,
        data: {
          callId,
          callType,
          callerName,
          timestamp: Date.now().toString(),
        },
      });
    } catch (error) {
      this.logger.error(`Error sending call notification: ${error.message}`, error.stack);
      // Don't throw the error, just log it and return null
      return null;
    }
  }

  /**
   * Generates a valid-looking test notification token for testing purposes
   * @returns A string that looks like a valid notification token
   */
  generateTestNotificationToken(): string {
    // Generate a random string that looks like a notification token
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_:';
    let result = '';
    // Tokens are typically 20+ characters
    const length = 32;
    
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
  }

  /**
   * Get notification tokens for all admin users
   * @returns Array of notification tokens for admin users
   */
  async getAdminNotificationTokens(): Promise<string[]> {
    try {
      // Find all admin and super admin users with notification tokens
      const admins = await this.prisma.user.findMany({
        where: {
          role: {
            in: [UserRole.ADMIN, UserRole.SUPER_ADMIN]
          },
          fcmToken: {
            not: null
          }
        },
        select: {
          fcmToken: true
        }
      });
      
      // Extract notification tokens from users, filter out any null values, and validate tokens
      const tokens = admins
        .map(admin => admin.fcmToken)
        .filter((token): token is string => !!token && this.isValidNotificationToken(token));
      
      this.logger.log(`Found ${tokens.length} admin notification tokens`);
      return tokens;
    } catch (error) {
      this.logger.error(`Error getting admin notification tokens: ${error.message}`, error.stack);
      return [];
    }
  }

  /**
   * Send a notification to all admin users
   * @param title Notification title
   * @param body Notification body
   * @param data Additional data to include in the notification
   * @returns Promise with the message IDs
   */
  async notifyAllAdmins(
    title: string,
    body: string,
    data?: Record<string, string>
  ) {
    try {
      // Get all admin notification tokens
      const adminTokens = await this.getAdminNotificationTokens();
      
      if (adminTokens.length === 0) {
        this.logger.warn('No admin tokens found for notification');
        return null;
      }
      
      // Send multicast notification to all admins
      return this.sendMulticastNotification(
        adminTokens,
        {
          title,
          body,
        },
        data
      );
    } catch (error) {
      this.logger.error(`Error notifying admins: ${error.message}`, error.stack);
      return null;
    }
  }
}
