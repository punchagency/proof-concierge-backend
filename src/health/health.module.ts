import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { AdvancedHealthController } from './advanced-health.controller';
import { PrismaModule } from '../database/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    HttpModule,
    PrismaModule,
    NotificationsModule,
  ],
  controllers: [HealthController, AdvancedHealthController],
  providers: [HealthService],
  exports: [HealthService],
})
export class HealthModule {} 