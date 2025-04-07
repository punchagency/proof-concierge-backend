import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { CallType } from '../entities/ticket.entity';

export class CreateTicketDto {
  @ApiProperty({ description: 'ID of the donor' })
  @IsString()
  donorId: string;

  @ApiProperty({ description: 'Email of the donor' })
  @IsEmail()
  donorEmail: string;

  @ApiProperty({ description: 'Description of the issue', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Whether a call is requested', default: true })
  @IsBoolean()
  @IsOptional()
  callRequested?: boolean = true;

  @ApiProperty({ description: 'Type of call: audio or video', required: true, enum: CallType })
  @IsEnum(CallType)
  callType: CallType;
} 