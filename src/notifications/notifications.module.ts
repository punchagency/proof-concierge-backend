import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../database/prisma.module';
import { NotificationsGateway } from './notifications.gateway';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    ConfigModule, 
    PrismaModule,
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '60d' },
    }),
  ],
  providers: [NotificationsService, NotificationsGateway],
  exports: [NotificationsService, NotificationsGateway],
})
export class NotificationsModule {}
