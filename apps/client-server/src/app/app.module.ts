import { Module } from '@nestjs/common';

import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AccountModule } from './account/account.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FileModule } from './file/file.module';
import { SettingsModule } from './settings/settings.module';
import { SubmissionModule } from './submission/submission.module';
import { WebSocketModule } from './web-socket/web-socket.module';
import { WebsitesModule } from './websites/websites.module';
import { FormGeneratorModule } from './form-generator/form-generator.module';
import { SubmissionOptionsModule } from './submission-options/submission-options.module';

@Module({
  imports: [
    AccountModule,
    WebSocketModule,
    WebsitesModule,
    FileModule,
    SubmissionModule,
    SettingsModule,
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'ui'),
      exclude: ['/api*'],
    }),
    FormGeneratorModule,
    SubmissionOptionsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
