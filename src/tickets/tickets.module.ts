import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './services/tickets.service';
import { CallsModule } from '../calls/calls.module';

@Module({
  imports: [DatabaseModule, CallsModule],
  controllers: [TicketsController],
  providers: [TicketsService],
  exports: [TicketsService],
})
export class TicketsModule {} 