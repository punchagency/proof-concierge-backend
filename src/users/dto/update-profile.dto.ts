import { IsOptional, IsString, IsEmail, Matches } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @Matches(/^data:image\/(jpeg|png|gif);base64,/, {
    message: 'Avatar must be a valid base64 encoded image (JPEG, PNG, or GIF)',
  })
  avatar?: string;
} 