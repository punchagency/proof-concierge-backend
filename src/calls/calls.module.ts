import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { CallsController } from './calls.controller';
import { CallsService } from './services/calls.service';
import { TextMessagesModule } from '../text-messages/text-messages.module';

@Module({
  imports: [DatabaseModule, TextMessagesModule],
  controllers: [CallsController],
  providers: [CallsService],
  exports: [CallsService],
})
export class CallsModule {} 