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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // makes .env available everywhere
    }),
    ScheduleModule.forRoot(), // Register the scheduling module
    DatabaseModule, // Prisma-based database module
    AuthModule,
    UsersModule,
    NotificationsModule,
    CommunicationModule,
    DonorQueriesModule,
    HealthModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
