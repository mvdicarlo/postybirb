import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway()
export class WSGateway {
  @WebSocketServer()
  server: Server;

  public emit(
    event: string,
    data: Record<string, unknown> | Record<string, unknown>[]
  ) {
    this.server.emit(event, data);
  }
}
