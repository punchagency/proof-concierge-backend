import { Controller, Post, Get, Body, Query, Param, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { GetMessagesDto } from './dto/get-messages.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('messages')
  async createMessage(@Body() createMessageDto: CreateMessageDto) {
    return this.chatService.createMessage(createMessageDto);
  }

  @Get('messages')
  async getMessages(@Query() getMessagesDto: GetMessagesDto) {
    return this.chatService.getMessages(getMessagesDto);
  }

  @Get('messages/donor-query/:id')
  async getMessagesByDonorQuery(@Param('id') id: string) {
    return this.chatService.getMessagesByDonorQuery(+id);
  }

  @Get('messages/between/:userId1/:userId2')
  async getMessagesBetweenUsers(
    @Param('userId1') userId1: string,
    @Param('userId2') userId2: string,
  ) {
    return this.chatService.getMessagesBetweenUsers(+userId1, +userId2);
  }
}
