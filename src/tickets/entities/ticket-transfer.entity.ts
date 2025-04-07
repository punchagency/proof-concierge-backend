import { ApiProperty } from '@nestjs/swagger';

export class TicketTransfer {
  @ApiProperty({ description: 'Unique identifier for the transfer' })
  id: string;

  @ApiProperty({ description: 'ID of the ticket being transferred' })
  ticketId: string;

  @ApiProperty({ description: 'ID of the admin transferring the ticket' })
  fromAdminId: number;

  @ApiProperty({ description: 'ID of the admin receiving the ticket' })
  toAdminId: number;

  @ApiProperty({ description: 'Optional notes about the transfer', required: false })
  transferNotes?: string;

  @ApiProperty({ description: 'When the transfer occurred' })
  transferredAt: Date;
} 