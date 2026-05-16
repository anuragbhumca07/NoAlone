import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';
import { RedisService } from '../redis/redis.service';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private jwtService: JwtService,
    private chatService: ChatService,
    private redis: RedisService,
    private usersService: UsersService,
    private notificationsService: NotificationsService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.replace('Bearer ', '');
      const payload = this.jwtService.verify(token);
      client.data.userId = payload.sub;

      await this.redis.setUserOnline(payload.sub, client.id);
      await this.usersService.setOnlineStatus(payload.sub, true);

      // Join personal room
      client.join(`user:${payload.sub}`);

      // Notify friends of online status
      this.server.emit('user:online', { userId: payload.sub });

      this.logger.log(`User ${payload.sub} connected`);
    } catch (e) {
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    if (client.data.userId) {
      await this.redis.setUserOffline(client.data.userId);
      await this.usersService.setOnlineStatus(client.data.userId, false);
      this.server.emit('user:offline', { userId: client.data.userId });
      this.logger.log(`User ${client.data.userId} disconnected`);
    }
  }

  @SubscribeMessage('message:send')
  async handleMessage(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
    try {
      const message = await this.chatService.saveMessage(client.data.userId, data);

      // Get conversation to find the other user
      const conv = await this.chatService.getOrCreateConversation(client.data.userId, {
        targetUserId: data.targetUserId,
      });

      const otherUserId = conv.user1Id === client.data.userId ? conv.user2Id : conv.user1Id;

      // Emit to both users
      this.server.to(`user:${client.data.userId}`).emit('message:new', message);
      this.server.to(`user:${otherUserId}`).emit('message:new', message);

      // Send push notification if offline
      const isOnline = await this.redis.isUserOnline(otherUserId);
      if (!isOnline) {
        await this.notificationsService.sendToUser(otherUserId, {
          title: `New message from ${message.sender.displayName}`,
          body: data.content || 'Sent a media message',
          data: { type: 'message', conversationId: data.conversationId },
        });
      }

      return { success: true, message };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  @SubscribeMessage('message:typing')
  handleTyping(@ConnectedSocket() client: Socket, @MessageBody() data: { conversationId: string; targetUserId: string }) {
    this.server.to(`user:${data.targetUserId}`).emit('message:typing', {
      userId: client.data.userId,
      conversationId: data.conversationId,
    });
  }

  @SubscribeMessage('message:read')
  async handleRead(@ConnectedSocket() client: Socket, @MessageBody() data: { conversationId: string; targetUserId: string }) {
    await this.chatService.markAsRead(data.conversationId, client.data.userId);
    this.server.to(`user:${data.targetUserId}`).emit('message:read', {
      conversationId: data.conversationId,
      userId: client.data.userId,
    });
  }

  @SubscribeMessage('room:join')
  handleRoomJoin(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string }) {
    client.join(`room:${data.roomId}`);
    this.server.to(`room:${data.roomId}`).emit('room:user_joined', { userId: client.data.userId });
  }

  @SubscribeMessage('room:leave')
  handleRoomLeave(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string }) {
    client.leave(`room:${data.roomId}`);
    this.server.to(`room:${data.roomId}`).emit('room:user_left', { userId: client.data.userId });
  }

  @SubscribeMessage('room:message')
  async handleRoomMessage(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
    const message = await this.chatService.saveRoomMessage(client.data.userId, data);
    this.server.to(`room:${data.roomId}`).emit('room:message_new', message);
    return { success: true };
  }
}
