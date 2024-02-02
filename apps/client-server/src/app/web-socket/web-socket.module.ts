import { Global, Module } from '@nestjs/common';
import { WSGateway } from './web-socket-gateway';

@Global()
@Module({
  providers: [WSGateway],
  exports: [WSGateway],
})
export class WebSocketModule {}
