import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { WebsocketEvents } from './websocket.events';

@WebSocketGateway()
export class WSGateway {
  @WebSocketServer()
  private server: Server;

  public emit(socketEvent: WebsocketEvents) {
    const { event, data } = socketEvent;
    this.server.emit(event, data);
  }
}
