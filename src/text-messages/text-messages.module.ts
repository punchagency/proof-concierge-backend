import { Module } from '@nestjs/common';
import { TextMessagesService } from './services/text-messages.service';
import { TextMessagesController } from './text-messages.controller';
import { PrismaModule } from '../database/prisma.module';
import { TextMessagesGateway } from './text-messages.gateway';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '24h' }
    })
  ],
  controllers: [TextMessagesController],
  providers: [TextMessagesService, TextMessagesGateway],
  exports: [TextMessagesService, TextMessagesGateway]
})
export class TextMessagesModule {} 