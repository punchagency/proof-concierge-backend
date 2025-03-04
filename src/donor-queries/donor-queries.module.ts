import { Module } from '@nestjs/common';
import { DonorQueriesController } from './donor-queries.controller';
import { DonorQueriesService } from './donor-queries.service';
import { PrismaModule } from '../database/prisma.module';

@Module({
  imports: [
    PrismaModule,
  ],
  controllers: [DonorQueriesController],
  providers: [DonorQueriesService],
  exports: [DonorQueriesService],
})
export class DonorQueriesModule {}