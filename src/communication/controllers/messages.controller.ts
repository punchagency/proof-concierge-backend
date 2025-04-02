import { Controller, Post, Get, Body, Query, Param, UseGuards, HttpStatus, Request, HttpException } from '@nestjs/common';
import { MessagesService, CreateMessageDto, GetMessagesDto } from '../services/messages.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { UserRole, SenderType, MessageType } from '@prisma/client';
import { CreateAdminMessageDto } from '../dto/create-admin-message.dto';
import { Public } from 'src/auth/public.decorator';

@Controller({
  path: 'messages',
  version: '1'
})
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  /**
   * Legacy endpoint for creating a message (maintained for backward compatibility)
   */
  @Post()
  @Public()
  async createMessage(@Body() createMessageDto: CreateMessageDto) {
    // For backward compatibility, derive senderType from isFromAdmin
    const senderType = createMessageDto.isFromAdmin 
      ? SenderType.ADMIN 
      : SenderType.DONOR;
    
    const message = await this.messagesService.create({
      ...createMessageDto,
      senderType
    });

    return {
      status: HttpStatus.CREATED,
      data: message,
    };
  }

  /**
   * New endpoint for creating a donor message with explicit donor information
   */
  @Post('donor/:queryId')
  @Public()
  async createDonorMessage(
    @Param('queryId') queryId: string,
    @Body() createDonorMessageDto: {
      content: string;
      donorId: string;
      messageType?: string;
    }
  ) {
    const message = await this.messagesService.create({
      content: createDonorMessageDto.content,
      queryId: +queryId,
      donorId: createDonorMessageDto.donorId,
      messageType: createDonorMessageDto.messageType as MessageType,
      isFromAdmin: false,
      senderType: SenderType.DONOR
    });

    return {
      status: HttpStatus.CREATED,
      data: message,
    };
  }

  @Get()
  async getMessages(@Query() getMessagesDto: GetMessagesDto) {
    const messages = await this.messagesService.findMessages(getMessagesDto);
    return {
      status: HttpStatus.OK,
      data: messages,
    };
  }

  @Get('query/:queryId')
  @Public()
  async getQueryMessages(@Param('queryId') queryId: string) {
    const messages = await this.messagesService.findQueryMessages(+queryId);
    return {
      status: HttpStatus.OK,
      data: messages,
    };
  }

  /**
   * Get all messages from a specific donor across all queries
   */
  @Get('donor/:donorId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getDonorMessages(@Param('donorId') donorId: string) {
    const messages = await this.messagesService.findMessagesByDonor(donorId);
    return {
      status: HttpStatus.OK,
      data: messages,
    };
  }

  @Get('between/:userId1/:userId2')
  async getMessagesBetweenUsers(
    @Param('userId1') userId1: string,
    @Param('userId2') userId2: string,
  ) {
    const messages = await this.messagesService.findMessagesBetweenUsers(+userId1, +userId2);
    return {
      status: HttpStatus.OK,
      data: messages,
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('admin/:queryId')
  async createAdminMessage(
    @Param('queryId') queryId: string,
    @Body() createAdminMessageDto: CreateAdminMessageDto,
    @Request() req: any,
  ) {
    const message = await this.messagesService.create({
      content: createAdminMessageDto.content,
      queryId: +queryId,
      senderId: req.user.id,
      messageType: createAdminMessageDto.messageType,
      isFromAdmin: true,
      senderType: SenderType.ADMIN
    });

    return {
      status: HttpStatus.CREATED,
      data: message,
    };
  }

  /**
   * Create a system message not associated with any specific user
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('system/:queryId')
  async createSystemMessage(
    @Param('queryId') queryId: string,
    @Body() createSystemMessageDto: { content: string; messageType?: string },
  ) {
    const message = await this.messagesService.create({
      content: createSystemMessageDto.content,
      queryId: +queryId,
      messageType: createSystemMessageDto.messageType as MessageType,
      isFromAdmin: true, // For backward compatibility
      senderType: SenderType.SYSTEM
    });

    return {
      status: HttpStatus.CREATED,
      data: message,
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('admin/:queryId')
  async getAdminMessages(
    @Param('queryId') queryId: string,
    @Query() query: GetMessagesDto,
    @Request() req: any,
  ) {
    // First check if the admin is assigned to this query
    const donorQuery = await this.messagesService.validateAdminAccess(+queryId, req.user.id);
    if (!donorQuery) {
      throw new HttpException(
        'You are not authorized to view messages for this query',
        HttpStatus.FORBIDDEN,
      );
    }

    const messages = await this.messagesService.findMessages({
      ...query,
      queryId: +queryId,
    });

    return {
      status: HttpStatus.OK,
      data: {
        messages,
        total: messages.length,
        limit: query.limit || 50,
        offset: query.offset || 0,
      },
    };
  }
} 