import { Module } from '@nestjs/common';
import { DonorQueriesController } from './donor-queries.controller';
import { DonorQueriesService } from './donor-queries.service';
import { PrismaModule } from '../database/prisma.module';
import { CommunicationModule } from '../communication/communication.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    PrismaModule,
    CommunicationModule,
    NotificationsModule,
  ],
  controllers: [DonorQueriesController],
  providers: [DonorQueriesService],
  exports: [DonorQueriesService],
})
export class DonorQueriesModule {}