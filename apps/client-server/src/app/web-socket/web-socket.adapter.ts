import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';

export class WebSocketAdapter extends IoAdapter {
  createIOServer(
    port: number,
    options?: ServerOptions & {
      namespace?: string;
      server?: unknown;
    }
  ) {
    const server = super.createIOServer(port, { ...options, cors: true });
    return server;
  }
}
