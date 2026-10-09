import { Module } from '@nestjs/common';
import { AccountModule } from '../account/account.module';
import { SettingsModule } from '../settings/settings.module';
import { WebsitesModule } from '../websites/websites.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [
    WebsitesModule,
    AccountModule,
    SettingsModule,
  ],
  providers: [NotificationsService],
  controllers: [NotificationsController],
  exports: [NotificationsService],
})
export class NotificationsModule {}
