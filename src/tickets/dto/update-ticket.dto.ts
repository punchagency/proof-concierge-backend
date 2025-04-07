import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { TicketStatus } from '../entities/ticket.entity';

export class UpdateTicketDto {
  @ApiProperty({ description: 'Description of the issue', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Status of the ticket', required: false, enum: TicketStatus })
  @IsEnum(TicketStatus)
  @IsOptional()
  status?: TicketStatus;

  @ApiProperty({ description: 'ID of the admin assigned to this ticket', required: false })
  @IsNumber()
  @IsOptional()
  adminId?: number;
} 