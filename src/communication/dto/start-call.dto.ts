import { IsOptional, IsEnum } from 'class-validator';

export enum CallType {
  VIDEO = 'video',
  AUDIO = 'audio'
}

export class StartCallDto {
  @IsOptional()
  @IsEnum(CallType)
  callType?: CallType = CallType.VIDEO; // Default to video call if not specified
} 