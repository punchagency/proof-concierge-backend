import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [
    NotificationsModule,
    DatabaseModule,
  ],
  providers: [ChatService],
  controllers: [ChatController],
  exports: [ChatService],
})
export class ChatModule {}
