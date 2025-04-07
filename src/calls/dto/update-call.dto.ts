import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { CallStatus } from '../entities/call.entity';

export class UpdateCallDto {
  @ApiProperty({ description: 'Status of the call', enum: CallStatus })
  @IsEnum(CallStatus)
  status: CallStatus;
} 