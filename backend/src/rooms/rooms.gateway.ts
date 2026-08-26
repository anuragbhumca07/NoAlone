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
import { RoomsService } from './rooms.service';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/rooms' })
export class RoomsGateway {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RoomsGateway.name);

  constructor(private jwtService: JwtService, private roomsService: RoomsService) {}

  @SubscribeMessage('voice:join')
  async handleVoiceJoin(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string; signal: any }) {
    const token = client.handshake.auth.token;
    try {
      const payload = this.jwtService.verify(token);
      const allowed = await this.roomsService.canAccessRoom(data.roomId, payload.sub);
      if (!allowed) return;
      client.join(`voice:${data.roomId}`);
      client.to(`voice:${data.roomId}`).emit('voice:user_joined', {
        userId: payload.sub,
        signal: data.signal,
      });
    } catch (e) {}
  }

  @SubscribeMessage('voice:signal')
  handleVoiceSignal(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string; targetUserId: string; signal: any }) {
    // Unlike voice:join/voice:leave, this had no auth check at all — anyone
    // could hit it without ever sending a valid token. No client currently
    // uses this event (voice rooms were never wired up past this
    // scaffolding), so it's not live-exploitable today, but there's no
    // reason for it to be the one handler in this file with no verification.
    const token = client.handshake.auth.token;
    try {
      const payload = this.jwtService.verify(token);
      this.server.to(`user:${data.targetUserId}`).emit('voice:signal', {
        fromUserId: payload.sub,
        signal: data.signal,
      });
    } catch (e) {}
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
