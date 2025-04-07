import { Controller, Get, Post, Body, Param, Put, UseGuards, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TextMessagesService } from './services/text-messages.service';
import { CreateTextMessageDto } from './dto/create-text-message.dto';
import { UpdateTextMessageDto } from './dto/update-text-message.dto';
import { TextMessage } from './entities/text-message.entity';

@ApiTags('text-messages')
@Controller({
  path: 'tickets/:ticketId/messages',
  version: '1',
})
export class TextMessagesController {
  constructor(private readonly textMessagesService: TextMessagesService) {}

  @Post()
  @Version('1')
  @ApiOperation({ summary: 'Create a new message for a ticket' })
  @ApiResponse({ status: 201, description: 'The message has been successfully created.', type: TextMessage })
  async create(
    @Param('ticketId') ticketId: string,
    @Body() createTextMessageDto: CreateTextMessageDto,
  ) {
    return this.textMessagesService.create(ticketId, createTextMessageDto);
  }

  @Get()
  @Version('1')
  @ApiOperation({ summary: 'Get all messages for a ticket' })
  @ApiResponse({ status: 200, description: 'List of messages', type: [TextMessage] })
  async findByTicket(@Param('ticketId') ticketId: string) {
    return this.textMessagesService.findByTicket(ticketId);
  }

  @Put(':id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a message' })
  @ApiResponse({ status: 200, description: 'Message has been updated', type: TextMessage })
  async update(
    @Param('id') id: string,
    @Body() updateTextMessageDto: UpdateTextMessageDto,
  ) {
    return this.textMessagesService.update(id, updateTextMessageDto);
  }

  @Post('mark-read')
  @Version('1')
  @ApiOperation({ summary: 'Mark messages as read for a sender type' })
  @ApiResponse({ status: 200, description: 'Messages have been marked as read' })
  async markAsRead(
    @Param('ticketId') ticketId: string,
    @Body('senderType') senderType: string,
  ) {
    await this.textMessagesService.markAsRead(ticketId, senderType);
    return { success: true };
  }
} 