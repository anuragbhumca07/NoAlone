import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { MatchingService } from './matching.service';
import { Logger } from '@nestjs/common';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/matching' })
export class MatchingGateway implements OnGatewayDisconnect {
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
      client.data.userId = userId;

      await this.matchingService.joinPool(userId, data);

      // Poll for match
      let attempts = 0;
      const maxAttempts = 30;

      const poll = async () => {
        // The client disconnected (tab closed, navigated away, or a prior
        // failed attempt got torn down) — stop polling and vacate the pool
        // instead of running for up to a minute against a dead socket and
        // potentially stealing a match meant for someone still searching.
        if (client.disconnected) {
          await this.matchingService.leavePool(userId).catch(() => {});
          return;
        }

        try {
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
        } catch (e) {
          this.logger.warn(`match poll failed for ${userId}: ${e.message}`);
          client.emit('match:error', { message: 'Matching failed, please try again' });
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

  // Disconnecting mid-search (closed tab, navigated away, lost connection)
  // must vacate the pool immediately — otherwise a still-running poll loop
  // can match a live searcher against a socket that's no longer there to
  // receive the result, silently swallowing their turn.
  async handleDisconnect(client: Socket) {
    if (!client.data.userId) return;
    try {
      await this.matchingService.leavePool(client.data.userId);
    } catch (e) {
      this.logger.warn(`cleanup on disconnect failed for ${client.data.userId}: ${e.message}`);
    }
  }
}
