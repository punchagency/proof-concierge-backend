import { Global, Module } from '@nestjs/common';
import { LoggingService } from './logging.service';
import { LoggingController } from './logging.controller';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { HttpLoggingInterceptor } from './interceptors/http-logging.interceptor';
import { UserActivityAspect } from './user-activity.aspect';

@Global()
@Module({
  providers: [
    LoggingService,
    UserActivityAspect,
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpLoggingInterceptor,
    },
  ],
  exports: [LoggingService, UserActivityAspect],
  controllers: [LoggingController],
})
export class LoggingModule {} 