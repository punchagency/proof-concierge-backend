import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../database/prisma.module';

import { MessagesService } from './services/messages.service';
import { CallsService } from './services/calls.service';
import { MessagesController } from './controllers/messages.controller';
import { CallsController } from './controllers/calls.controller';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    NotificationsModule,
    PrismaModule,
  ],
  providers: [MessagesService, CallsService],
  controllers: [MessagesController, CallsController],
  exports: [MessagesService, CallsService],
})
export class CommunicationModule {} 