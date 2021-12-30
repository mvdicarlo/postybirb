import {
  GatewayMetadata,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { WebSocketEvents } from './web-socket.events';

const gatewayMetadata: GatewayMetadata = {
  cors: {
    origin: ['*'],
  },
};

@WebSocketGateway({ cors: true })
export class WSGateway implements OnGatewayInit {
  @WebSocketServer()
  private server: Server;

  afterInit(server: Server) {
    server.use((socket, next) => {
      return next();
      // if (socket.handshake.headers.authorization === global.AUTH_ID) {
      //   return next();
      // }

      // return next(new Error('Authentication Error'));
    });
  }

  public emit(socketEvent: WebSocketEvents) {
    const { event, data } = socketEvent;
    this.server.emit(event, data);
  }
}
