import { Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class FileUploadService {
  // Maximum size in bytes (1MB)
  private readonly MAX_FILE_SIZE = 1 * 1024 * 1024;
  
  constructor() {}

  async uploadAvatarBase64(base64Image: string): Promise<string> {
    if (!base64Image) {
      throw new BadRequestException('No image provided');
    }

    // Check if it's a valid base64 image
    if (!this.isValidBase64Image(base64Image)) {
      throw new BadRequestException('Invalid image format. Must be a valid base64 encoded JPEG, PNG, or GIF');
    }

    // Extract the base64 data (remove the data:image/xxx;base64, prefix)
    const base64Data = base64Image.split(',')[1];
    
    // Check file size (base64 is ~33% larger than binary)
    const sizeInBytes = Math.ceil((base64Data.length * 3) / 4);
    if (sizeInBytes > this.MAX_FILE_SIZE) {
      throw new BadRequestException(`Image size exceeds the limit of 1MB`);
    }

    // Return the base64 string directly
    return base64Image;
  }

  private isValidBase64Image(base64String: string): boolean {
    // Check if it's a valid base64 image format
    const validFormats = [
      'data:image/jpeg;base64,',
      'data:image/png;base64,',
      'data:image/gif;base64,'
    ];
    
    return validFormats.some(format => base64String.startsWith(format));
  }

  // Keep this method for backward compatibility or cleanup
  async deleteAvatar(avatarUrl: string): Promise<void> {
    // No need to delete files since we're using base64
    return;
  }
} 