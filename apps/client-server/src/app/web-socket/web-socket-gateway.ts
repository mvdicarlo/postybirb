import {
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { getRemoteConfig } from '@postybirb/utils/electron';
import { Server } from 'socket.io';
import { WebSocketEvents } from './web-socket.events';

@WebSocketGateway({ cors: true })
export class WSGateway implements OnGatewayInit {
  @WebSocketServer()
  private server: Server;

  afterInit(server: Server) {
    server.use(async (socket, next) => {
      const remoteConfig = await getRemoteConfig();
      if (socket.handshake.headers.authorization === remoteConfig.password) {
        return next();
      }
      return next(new Error('Authentication Error'));
    });
  }

  public emit(socketEvent: WebSocketEvents) {
    const { event, data } = socketEvent;
    this.server.emit(event, data);
  }
}
