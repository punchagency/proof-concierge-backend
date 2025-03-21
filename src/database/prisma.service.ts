import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private readonly MAX_RETRIES = 5;
  private readonly RETRY_DELAY_MS = 3000;

  constructor() {
    super({
      log: ['query', 'info', 'warn', 'error'],
    });
  }

  async onModuleInit() {
    await this.connectWithRetry();
  }

  private async connectWithRetry(retryCount = 0): Promise<void> {
    try {
      this.logger.log('Attempting to connect to the database...');
      await this.$connect();
      this.logger.log('Successfully connected to the database');
    } catch (error) {
      if (retryCount < this.MAX_RETRIES) {
        this.logger.warn(`Database connection failed. Retrying (${retryCount + 1}/${this.MAX_RETRIES}) in ${this.RETRY_DELAY_MS / 1000}s...`);
        this.logger.debug(`Connection error: ${error.message}`);
        
        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, this.RETRY_DELAY_MS));
        
        // Retry connection
        return this.connectWithRetry(retryCount + 1);
      } else {
        this.logger.error(`Failed to connect to the database after ${this.MAX_RETRIES} attempts`);
        this.logger.error(`Last error: ${error.message}`);
        
        // Rethrow with more user-friendly message
        throw new Error(
          `Database connection failed after multiple attempts. Please check your database configuration and ensure the database is running.`
        );
      }
    }
  }

  async onModuleDestroy() {
    this.logger.log('Disconnecting from database...');
    await this.$disconnect();
    this.logger.log('Successfully disconnected from database');
  }

  // Helper method to clean sensitive data before returning
  cleanUserData(user: any) {
    if (user && user.password) {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    }
    return user;
  }
} 