import { Injectable, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import * as argon2 from 'argon2';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const users = await this.prisma.user.findMany();
    return users.map(user => this.prisma.cleanUserData(user));
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    
    return this.prisma.cleanUserData(user);
  }

  async findByUsername(username: string) {
    return this.prisma.user.findUnique({
      where: { username },
    });
  }

  async create(userData: any) {
    const hashedPassword = await argon2.hash(userData.password);
    
    const user = await this.prisma.user.create({
      data: {
        ...userData,
        password: hashedPassword,
      },
    });
    
    return this.prisma.cleanUserData(user);
  }

  async update(id: number, userData: any) {
    if (userData.password) {
      userData.password = await argon2.hash(userData.password);
    }
    
    const user = await this.prisma.user.update({
      where: { id },
      data: userData,
    });
    
    return this.prisma.cleanUserData(user);
  }

  async remove(id: number) {
    await this.prisma.user.delete({
      where: { id },
    });
    
    return { id };
  }

  async updateFcmToken(userId: number, fcmToken: string) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { fcmToken },
    });
    
    return this.prisma.cleanUserData(user);
  }

  async updateProfile(userId: number, updateProfileDto: UpdateProfileDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: updateProfileDto,
    });
    
    return this.prisma.cleanUserData(user);
  }

  async changePassword(userId: number, changePasswordDto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    
    // Verify current password
    const isPasswordValid = await argon2.verify(user.password, changePasswordDto.currentPassword);
    
    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    
    // Check if new password is the same as the current one
    if (changePasswordDto.currentPassword === changePasswordDto.newPassword) {
      throw new BadRequestException('New password must be different from the current password');
    }
    
    // Hash and update the new password
    const hashedPassword = await argon2.hash(changePasswordDto.newPassword);
    
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
    
    return this.prisma.cleanUserData(updatedUser);
  }
}
