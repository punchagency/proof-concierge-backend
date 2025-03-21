import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { LoggingService } from './logging.service';

@Injectable()
export class UserActivityAspect {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly loggingService: LoggingService
  ) {
    this.loggingService.setContext('UserActivity');
  }

  async logActivity(userId: number, action: string, details: Record<string, any> = {}) {
    try {
      // Get the username for better logs
      const user = await this.prismaService.user.findUnique({
        where: { id: userId },
        select: { username: true, name: true }
      });
      
      if (user) {
        // Log the activity with username
        this.loggingService.logUserActivity(
          userId,
          user.username,
          action,
          details
        );
      } else {
        // Log the activity without username (user not found)
        this.loggingService.logUserActivity(
          userId,
          'unknown',
          action,
          details
        );
      }
    } catch (error) {
      this.loggingService.error(`Failed to log user activity: ${error.message}`, error.stack, {
        userId,
        action,
        details
      });
    }
  }
} 