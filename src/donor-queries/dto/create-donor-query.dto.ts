import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum CallType {
  VIDEO = 'video',
  AUDIO = 'audio',
}

export class CreateDonorQueryDto {
  @IsString()
  @IsNotEmpty()
  donor: string;

  @IsString()
  @IsNotEmpty()
  donorId: string;

  @IsString()
  @IsNotEmpty()
  test: string;

  @IsString()
  @IsNotEmpty()
  stage: string;

  @IsString()
  @IsNotEmpty()
  device: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  fcmToken?: string;
  
  @IsEnum(CallType)
  @IsOptional()
  callType?: CallType = CallType.VIDEO; // Default to video call if not specified
} 