import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

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
} 