import { Module } from '@nestjs/common';
import { CommunicationService } from './communication.service';
import { CommunicationController } from './communication.controller';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { NotificationsModule } from 'src/notifications/notifications.module';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    NotificationsModule,
  ],
  providers: [CommunicationService],
  controllers: [CommunicationController],
  exports: [CommunicationService],
})
export class CommunicationModule {} 