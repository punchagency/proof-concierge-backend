import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { NotificationsModule } from './notifications/notifications.module';
import { CommunicationModule } from './communication/communication.module';
import { DonorQueriesModule } from './donor-queries/donor-queries.module';
import { HealthModule } from './health/health.module';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // makes .env available everywhere
    }),
    DatabaseModule, // Prisma-based database module
    AuthModule,
    UsersModule,
    NotificationsModule,
    CommunicationModule,
    DonorQueriesModule,
    HealthModule,
  ],
})
export class AppModule {}
