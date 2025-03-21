import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { UserRole } from '@prisma/client';

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);
  private adminApp: admin.app.App;
  private isInitialized = false;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService
  ) {}

  onModuleInit() {
    try {
      // Check if Firebase is already initialized
      try {
        this.adminApp = admin.app();
        this.isInitialized = true;
        this.logger.log('Firebase Admin SDK already initialized');
        return;
      } catch (error) {
        // App not initialized yet, continue with initialization
        this.logger.log('Initializing Firebase Admin SDK');
      }

      // Get Firebase configuration from environment variables
      const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
      const clientEmail = this.configService.get<string>('FIREBASE_CLIENT_EMAIL');
      const privateKey = this.configService.get<string>('FIREBASE_PRIVATE_KEY');

      if (!projectId || !clientEmail || !privateKey) {
        this.logger.warn('Firebase credentials not fully configured. FCM notifications will be disabled.');
        this.logger.warn('Missing credentials:', {
          projectId: !projectId,
          clientEmail: !clientEmail,
          privateKey: !privateKey,
        });
        return;
      }

      // Initialize Firebase Admin SDK for server-side notifications
      this.adminApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          // Replace escaped newlines with actual newline characters
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
      });

      this.isInitialized = true;
      this.logger.log('Firebase Admin SDK initialized successfully');
    } catch (error) {
      this.logger.error('Error initializing Firebase Admin SDK:', error);
      // Don't throw the error, just log it and continue
    }
  }

  /**
   * Validates if a token appears to be a valid FCM token
   * @param token The FCM token to validate
   * @returns boolean indicating if the token appears valid
   */
  isValidFcmToken(token: string): boolean {
    // FCM tokens are typically long strings (140+ characters)
    if (!token || typeof token !== 'string') {
      return false;
    }
    
    // Check for common test tokens
    if (
      token === 'test-fcm-token' || 
      token === 'RECIPIENT_FCM_TOKEN' || 
      token.length < 20
    ) {
      return false;
    }
    
    // Basic format validation - FCM tokens are typically alphanumeric with some special chars
    const validTokenPattern = /^[a-zA-Z0-9:_\-]+$/;
    return validTokenPattern.test(token);
  }

  /**
   * Send a notification to a specific device using FCM
   * @param token FCM device token
   * @param payload Notification payload
   * @returns Promise with the message ID
   */
  async sendNotification(
    token: string,
    payload: Omit<admin.messaging.Message, 'token'>,
  ) {
    try {
      if (!this.isInitialized) {
        this.logger.warn('Firebase Admin SDK not initialized. Skipping notification.');
        return null;
      }

      // Validate the token format
      if (!this.isValidFcmToken(token)) {
        this.logger.warn(`Invalid FCM token format: ${token}`);
        return null;
      }

      this.logger.log(`Sending notification to token: ${token}`);
      // Merge the token into the payload and send
      const result = await admin.messaging().send({ ...payload, token });
      this.logger.log(`Notification sent successfully: ${result}`);
      return result;
    } catch (error) {
      this.logger.error(`Error sending notification: ${error.message}`, error.stack);
      // Don't throw the error, just log it and return null
      return null;
    }
  }

  /**
   * Send a notification to multiple devices using FCM
   * @param tokens Array of FCM device tokens
   * @param payload Notification payload
   * @returns Promise with the message IDs
   */
  async sendMulticastNotification(
    tokens: string[],
    payload: admin.messaging.MulticastMessage['notification'],
    data?: admin.messaging.MulticastMessage['data'],
  ) {
    try {
      if (!this.isInitialized) {
        this.logger.warn('Firebase Admin SDK not initialized. Skipping multicast notification.');
        return null;
      }

      // Filter out invalid tokens
      const validTokens = tokens.filter(token => this.isValidFcmToken(token));
      
      if (validTokens.length === 0) {
        this.logger.warn('No valid FCM tokens provided for multicast notification.');
        return null;
      }
      
      if (validTokens.length < tokens.length) {
        this.logger.warn(`Filtered out ${tokens.length - validTokens.length} invalid tokens from multicast notification.`);
      }

      this.logger.log(`Sending multicast notification to ${validTokens.length} devices`);
      const message: admin.messaging.MulticastMessage = {
        tokens: validTokens,
        notification: payload,
        data,
      };
      
      // Use the messaging() function to send multicast messages
      const batchResponse = await admin.messaging().sendEachForMulticast(message);
      this.logger.log(`${batchResponse.successCount} messages were sent successfully`);
      
      if (batchResponse.failureCount > 0) {
        const failedTokens: Array<{token: string, error: any}> = [];
        batchResponse.responses.forEach((resp, idx) => {
          if (!resp.success) {
            failedTokens.push({ token: validTokens[idx], error: resp.error });
          }
        });
        this.logger.warn(`Failed to send to some tokens:`, failedTokens);
      }
      
      return batchResponse;
    } catch (error) {
      this.logger.error(`Error sending multicast notification: ${error.message}`, error.stack);
      // Don't throw the error, just log it and return null
      return null;
    }
  }

  /**
   * Send a notification about a new call
   * @param recipientToken FCM token of the recipient
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
      if (!this.isInitialized) {
        this.logger.warn('Firebase Admin SDK not initialized. Skipping call notification.');
        return null;
      }

      // Validate the token format
      if (!this.isValidFcmToken(recipientToken)) {
        this.logger.warn(`Invalid FCM token format for call notification: ${recipientToken}`);
        return null;
      }

      return this.sendNotification(recipientToken, {
        notification: {
          title: `Incoming ${callType} call`,
          body: `${callerName} is calling you`,
        },
        data: {
          callId,
          callType,
          callerName,
          timestamp: Date.now().toString(),
        },
        android: {
          priority: 'high',
          notification: {
            channelId: 'calls',
            priority: 'high',
            sound: 'default',
            visibility: 'public',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              category: 'CALL',
              contentAvailable: true,
            },
          },
        },
      });
    } catch (error) {
      this.logger.error(`Error sending call notification: ${error.message}`, error.stack);
      // Don't throw the error, just log it and return null
      return null;
    }
  }

  /**
   * Generates a valid-looking test FCM token for testing purposes
   * Note: This is NOT a real FCM token and will not work with Firebase
   * It's only for testing the validation logic
   * @returns A string that looks like a valid FCM token
   */
  generateTestFcmToken(): string {
    // Generate a random string that looks like an FCM token
    // Real FCM tokens are much more complex, but this is just for testing
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_:';
    let result = '';
    // FCM tokens are typically 140+ characters
    const length = 152;
    
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
  }

  /**
   * Get FCM tokens for all admin users
   * @returns Array of FCM tokens for admin users
   */
  async getAdminFcmTokens(): Promise<string[]> {
    try {
      // Find all admin and super admin users with FCM tokens
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
      
      // Extract FCM tokens from users, filter out any null values, and validate tokens
      const tokens = admins
        .map(admin => admin.fcmToken)
        .filter((token): token is string => !!token && this.isValidFcmToken(token));
      
      this.logger.log(`Found ${tokens.length} admin FCM tokens`);
      return tokens;
    } catch (error) {
      this.logger.error(`Error getting admin FCM tokens: ${error.message}`, error.stack);
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
      // Get all admin FCM tokens
      const adminTokens = await this.getAdminFcmTokens();
      
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
