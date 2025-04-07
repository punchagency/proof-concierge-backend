import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class TransferTicketDto {
  @ApiProperty({ description: 'ID of the admin to transfer the ticket to' })
  @IsNumber()
  toAdminId: number;

  @ApiProperty({ description: 'Notes about the transfer', required: false })
  @IsString()
  @IsOptional()
  transferNotes?: string;
} 