import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';
import { InitiatedBy } from '../entities/call.entity';
import { CallType } from '../../tickets/entities/ticket.entity';

export class CreateCallDto {
  @ApiProperty({ description: 'ID of the ticket this call belongs to' })
  @IsString()
  ticketId: string;

  @ApiProperty({ description: 'Type of call: audio or video', enum: CallType })
  @IsEnum(CallType)
  callType: CallType;

  @ApiProperty({ description: 'Who initiated the call: donor or admin', enum: InitiatedBy })
  @IsEnum(InitiatedBy)
  initiatedBy: InitiatedBy;
} 