import {
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { RemoteConfigManager } from '@postybirb/utils/common';
import { Server } from 'socket.io';
import { WebSocketEvents } from './web-socket.events';

@WebSocketGateway({ cors: true })
export class WSGateway implements OnGatewayInit {
  @WebSocketServer()
  private server: Server;

  afterInit(server: Server) {
    server.use(async (socket, next) => {
      const remoteConfig = await RemoteConfigManager.get();
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
