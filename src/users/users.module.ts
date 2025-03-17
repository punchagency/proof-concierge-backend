import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaService } from '../database/prisma.service';
import { FileUploadService } from './file-upload.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, PrismaService, FileUploadService],
  exports: [UsersService],
})
export class UsersModule {}
