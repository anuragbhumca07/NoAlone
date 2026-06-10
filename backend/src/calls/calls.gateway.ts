import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';

/**
 * Call gateway shares the /chat namespace to leverage existing authenticated
 * socket connections. Call events are emitted to user:<id> rooms.
 */
@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/chat',
})
export class CallsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(CallsGateway.name);

  constructor(private jwtService: JwtService) {}

  handleConnection(_client: Socket) {
    // Connection handling is owned by ChatGateway in the same namespace.
    // This gateway is registered solely to expose this.server for call events.
  }

  handleDisconnect(_client: Socket) {}

  /** Emit a call event to a specific user's personal room */
  emitToUser(userId: string, event: string, data: any): void {
    this.server.to(`user:${userId}`).emit(event, data);
  }
}
