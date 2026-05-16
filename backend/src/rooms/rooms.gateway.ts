import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/rooms' })
export class RoomsGateway {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RoomsGateway.name);

  constructor(private jwtService: JwtService) {}

  @SubscribeMessage('voice:join')
  handleVoiceJoin(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string; signal: any }) {
    const token = client.handshake.auth.token;
    try {
      const payload = this.jwtService.verify(token);
      client.join(`voice:${data.roomId}`);
      client.to(`voice:${data.roomId}`).emit('voice:user_joined', {
        userId: payload.sub,
        signal: data.signal,
      });
    } catch (e) {}
  }

  @SubscribeMessage('voice:signal')
  handleVoiceSignal(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string; targetUserId: string; signal: any }) {
    this.server.to(`user:${data.targetUserId}`).emit('voice:signal', {
      fromUserId: client.data.userId,
      signal: data.signal,
    });
  }

  @SubscribeMessage('voice:leave')
  handleVoiceLeave(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string }) {
    const token = client.handshake.auth.token;
    try {
      const payload = this.jwtService.verify(token);
      client.leave(`voice:${data.roomId}`);
      this.server.to(`voice:${data.roomId}`).emit('voice:user_left', { userId: payload.sub });
    } catch (e) {}
  }
}
