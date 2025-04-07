import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { NotificationsModule } from './notifications/notifications.module';
import { CommunicationModule } from './communication/communication.module';
import { DonorQueriesModule } from './donor-queries/donor-queries.module';
import { HealthModule } from './health/health.module';
import { DatabaseModule } from './database/database.module';
import { AppController } from './app.controller';
import { LoggingModule } from './logging/logging.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ActivityLoggingInterceptor } from './logging/interceptors/activity-logging.interceptor';
import { TicketsModule } from './tickets/tickets.module';
import { CallsModule } from './calls/calls.module';
import { TextMessagesModule } from './text-messages/text-messages.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // makes .env available everywhere
    }),
    LoggingModule, // Register logging module first to capture all logs
    ScheduleModule.forRoot(), // Register the scheduling module
    DatabaseModule, // Prisma-based database module
    AuthModule,
    UsersModule,
    NotificationsModule,
    CommunicationModule,
    DonorQueriesModule,
    HealthModule,
    TicketsModule,
    CallsModule,
    TextMessagesModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: ActivityLoggingInterceptor,
    },
  ],
})
export class AppModule {}
