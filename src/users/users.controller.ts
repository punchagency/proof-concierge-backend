import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Request, HttpStatus, HttpCode, BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { FileUploadService } from './file-upload.service';

@Controller({ path: 'users', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly fileUploadService: FileUploadService,
  ) {}

  @Get('me')
  async getProfile(@Request() req) {
    return this.usersService.findOne(req.user.userId);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  create(@Body() createUserDto: any) {
    return this.usersService.create(createUserDto);
  }

  @Put(':id')
  @Roles(UserRole.SUPER_ADMIN)
  update(@Param('id') id: string, @Body() updateUserDto: any) {
    return this.usersService.update(+id, updateUserDto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }

  @Put('me/fcm-token')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async updateFcmToken(@Request() req, @Body() body: { fcmToken: string }) {
    return this.usersService.updateFcmToken(req.user.userId, body.fcmToken);
  }

  @Put('me/profile')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async updateProfile(@Request() req, @Body() updateProfileDto: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user.userId, updateProfileDto);
  }

  @Put('me/password')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async changePassword(@Request() req, @Body() changePasswordDto: ChangePasswordDto) {
    return this.usersService.changePassword(req.user.userId, changePasswordDto);
  }

  @Post('me/avatar')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async uploadAvatar(@Request() req, @Body() body: { avatar: string }) {
    if (!body.avatar) {
      throw new BadRequestException('No image provided');
    }

    // Validate and process the base64 image
    const avatarBase64 = await this.fileUploadService.uploadAvatarBase64(body.avatar);

    // Get the current user
    const user = await this.usersService.findOne(req.user.userId);
    
    // Update the user's avatar in the database
    return this.usersService.updateProfile(req.user.userId, { avatar: avatarBase64 });
  }
} 