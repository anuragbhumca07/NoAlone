import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { SendMessageDto, CreateConversationDto } from './dto/send-message.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Chat')
@Controller('chat')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Post('conversations')
  @ApiOperation({ summary: 'Get or create conversation' })
  getOrCreate(@Req() req: any, @Body() dto: CreateConversationDto) {
    return this.chatService.getOrCreateConversation(req.user.id, dto);
  }

  @Get('conversations')
  @ApiOperation({ summary: 'Get all conversations' })
  getConversations(@Req() req: any) {
    return this.chatService.getConversations(req.user.id);
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Get messages in a conversation' })
  getMessages(
    @Req() req: any,
    @Param('id') id: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limitStr?: string,
  ) {
    const limit = limitStr ? parseInt(limitStr, 10) : 30;
    return this.chatService.getMessages(id, req.user.id, cursor, limit);
  }

  @Get('unread')
  @ApiOperation({ summary: 'Get unread message counts' })
  getUnread(@Req() req: any) {
    return this.chatService.getUnreadCount(req.user.id);
  }
}
