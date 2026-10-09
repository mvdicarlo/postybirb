import { Module } from '@nestjs/common';
import { WebSocketModule } from '../web-socket/web-socket.module';
import { UpdateController } from './update.controller';
import { UpdateService } from './update.service';

@Module({
  imports: [WebSocketModule],
  providers: [UpdateService],
  controllers: [UpdateController],
})
export class UpdateModule {}
