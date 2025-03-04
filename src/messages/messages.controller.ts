import { Controller, Get, Post, Body, Param, UseGuards, HttpStatus } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Public } from '../auth/public.decorator';

@Controller({
  path: 'messages',
  version: '1'
})
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Public()
  @Post()
  async create(@Body() createMessageDto: {
    content: string;
    queryId: number;
    isFromAdmin: boolean;
  }) {
    const message = await this.messagesService.create(createMessageDto);
    return {
      status: HttpStatus.CREATED,
      data: message,
    };
  }

  @Public()
  @Get(':queryId')
  async findByQuery(@Param('queryId') queryId: string) {
    const messages = await this.messagesService.findByQuery(+queryId);
    return {
      status: HttpStatus.OK,
      data: messages,
    };
  }
} 