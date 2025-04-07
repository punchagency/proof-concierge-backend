import { ApiProperty } from '@nestjs/swagger';

export class Call {
  @ApiProperty({ description: 'Unique identifier for the call' })
  id: string;

  @ApiProperty({ description: 'ID of the ticket this call belongs to' })
  ticketId: string;

  @ApiProperty({ description: 'DailyJS room URL for this call' })
  dailyRoomUrl: string;

  @ApiProperty({ description: 'Current status of the call' })
  status: string;

  @ApiProperty({ description: 'Type of call: audio or video' })
  callType: string;

  @ApiProperty({ description: 'Who initiated the call: donor or admin' })
  initiatedBy: string;

  @ApiProperty({ description: 'When the call started' })
  startedAt: Date;

  @ApiProperty({ description: 'When the call ended', required: false, nullable: true })
  endedAt?: Date | null;

  @ApiProperty({ description: 'Token for the donor to join the call' })
  userToken: string;

  @ApiProperty({ description: 'Token for the admin to join the call' })
  adminToken: string;

  @ApiProperty({ description: 'When the call record was created' })
  createdAt: Date;

  @ApiProperty({ description: 'When the call record was last updated' })
  updatedAt: Date;
}

export enum CallStatus {
  ACTIVE = 'active',
  ENDED = 'ended',
}

export enum InitiatedBy {
  DONOR = 'donor',
  ADMIN = 'admin',
} 