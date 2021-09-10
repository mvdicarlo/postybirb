import { Global, Module } from '@nestjs/common';
import { WSGateway } from './websocket.gateway';

@Global()
@Module({
  providers: [WSGateway],
  exports: [WSGateway],
})
export class WebsocketModule {}
