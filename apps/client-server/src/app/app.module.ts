import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AccountModule } from './account/account.module';
import { WebSocketModule } from './web-socket/web-socket.module';
import { WebsitesModule } from './websites/websites.module';
import { FileModule } from './file/file.module';
import { SubmissionModule } from './submission/submission.module';
import { SettingsModule } from './settings/settings.module';

@Module({
  imports: [
    AccountModule,
    WebSocketModule,
    WebsitesModule,
    FileModule,
    SubmissionModule,
    SettingsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
