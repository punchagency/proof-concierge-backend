import { ApiProperty } from '@nestjs/swagger';

export class Ticket {
  @ApiProperty({ description: 'Unique identifier for the ticket' })
  id: string;

  @ApiProperty({ description: 'Donor ID provided during ticket creation' })
  donorId: string;

  @ApiProperty({ description: 'Donor email address' })
  donorEmail: string;

  @ApiProperty({ description: 'Description of the issue', required: false, nullable: true })
  description?: string | null;

  @ApiProperty({ description: 'Whether a call was requested', default: false })
  callRequested: boolean;

  @ApiProperty({ description: 'Type of call: audio or video', required: false, nullable: true })
  callType?: string | null;

  @ApiProperty({ description: 'Current status of the ticket' })
  status: string;

  @ApiProperty({ description: 'ID of the admin assigned to this ticket', required: false, nullable: true })
  adminId?: number | null;

  @ApiProperty({ description: 'ID of the active call (if exists)', required: false, nullable: true })
  activeCallId?: string | null;

  @ApiProperty({ description: 'When the ticket was created' })
  createdAt: Date;

  @ApiProperty({ description: 'When the ticket was last updated' })
  updatedAt: Date;
}

export enum TicketStatus {
  NEW = 'new',
  PENDING = 'pending',
  ACTIVE_CALL = 'active_call',
  TRANSFERRED = 'transferred',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export enum CallType {
  AUDIO = 'audio',
  VIDEO = 'video',
} 