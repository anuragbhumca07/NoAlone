import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { MatchingService } from './matching.service';
import { Logger } from '@nestjs/common';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/matching' })
export class MatchingGateway {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MatchingGateway.name);

  constructor(
    private jwtService: JwtService,
    private matchingService: MatchingService,
  ) {}

  @SubscribeMessage('match:search')
  async handleSearch(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
    const token = client.handshake.auth.token;
    try {
      const payload = this.jwtService.verify(token);
      const userId = payload.sub;

      await this.matchingService.joinPool(userId, data);

      // Poll for match
      let attempts = 0;
      const maxAttempts = 30;

      const poll = async () => {
        if (attempts >= maxAttempts) {
          client.emit('match:timeout', { message: 'No match found, try again' });
          await this.matchingService.leavePool(userId);
          return;
        }

        const result = await this.matchingService.findMatch(userId);
        if (result.matched) {
          client.emit('match:found', result);
          // Also notify the matched user
          this.server.emit(`match:found:${result.user.id}`, result);
        } else {
          attempts++;
          setTimeout(poll, 2000);
        }
      };

      setTimeout(poll, 1000);

    } catch (e) {
      client.emit('match:error', { message: 'Authentication failed' });
    }
  }

  @SubscribeMessage('match:cancel')
  async handleCancel(@ConnectedSocket() client: Socket) {
    const token = client.handshake.auth.token;
    try {
      const payload = this.jwtService.verify(token);
      await this.matchingService.leavePool(payload.sub);
      client.emit('match:cancelled', {});
    } catch (e) {}
  }
}
