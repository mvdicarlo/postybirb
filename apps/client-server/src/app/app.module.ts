import { Module } from '@nestjs/common';

import { ScheduleModule } from '@nestjs/schedule';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AccountModule } from './account/account.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DirectoryWatchersModule } from './directory-watchers/directory-watchers.module';
import { FileModule } from './file/file.module';
import { FormGeneratorModule } from './form-generator/form-generator.module';
import { SettingsModule } from './settings/settings.module';
import { WebsiteOptionsModule } from './submission-options/website-options.module';
import { SubmissionModule } from './submission/submission.module';
import { TagConvertersModule } from './tag-converters/tag-converters.module';
import { TagGroupsModule } from './tag-groups/tag-groups.module';
import { WebSocketModule } from './web-socket/web-socket.module';
import { WebsitesModule } from './websites/websites.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    AccountModule,
    WebSocketModule,
    WebsitesModule,
    FileModule,
    SubmissionModule,
    SettingsModule,
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'postybirb-ui'),
      exclude: ['/api*'],
    }),
    FormGeneratorModule,
    WebsiteOptionsModule,
    TagGroupsModule,
    TagConvertersModule,
    DirectoryWatchersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
