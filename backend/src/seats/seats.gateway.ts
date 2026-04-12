import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: { origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true },
  namespace: '/seats',
})
export class SeatsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(SeatsGateway.name);

  afterInit() {
    this.logger.log('SeatsGateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join-event-room')
  handleJoinRoom(
    @MessageBody() eventId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`event:${eventId}`);
    this.logger.log(`Client ${client.id} joined room event:${eventId}`);
  }

  @SubscribeMessage('leave-event-room')
  handleLeaveRoom(
    @MessageBody() eventId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`event:${eventId}`);
  }

  /** Broadcast seat status change to all clients in the event room */
  broadcastSeatUpdate(eventId: string, seatId: string, status: string, heldUntil?: Date) {
    this.server.to(`event:${eventId}`).emit('seat-updated', {
      seatId,
      status,
      heldUntil,
      timestamp: new Date(),
    });
  }

  /** Broadcast summary stats */
  broadcastSeatSummary(eventId: string, summary: Record<string, number>) {
    this.server.to(`event:${eventId}`).emit('seat-summary', { eventId, summary });
  }
}
