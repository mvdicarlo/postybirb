import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { WebSocketEvents } from './web-socket.events';

@WebSocketGateway()
export class WSGateway {
  @WebSocketServer()
  private server: Server;

  public emit(socketEvent: WebSocketEvents) {
    const { event, data } = socketEvent;
    this.server.emit(event, data);
  }
}
