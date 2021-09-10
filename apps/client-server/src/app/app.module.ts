import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AccountsModule } from './accounts/accounts.module';
import { WebsocketModule } from './websocket/websocket.module';

@Module({
  imports: [AccountsModule, WebsocketModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
