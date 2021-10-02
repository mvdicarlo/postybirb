import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AccountModule } from './account/account.module';
import { WebSocketModule } from './web-socket/web-socket.module';
import { WebsitesModule } from './websites/websites.module';

@Module({
  imports: [AccountModule, WebSocketModule, WebsitesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
