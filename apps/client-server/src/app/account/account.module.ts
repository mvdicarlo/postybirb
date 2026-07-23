import { Module } from '@nestjs/common';
import { WebsitesModule } from '../websites/websites.module';
import { AccountEventListener } from './account-event.listener';
import { AccountTemplateDefaultsService } from './account-template-defaults.service';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';

@Module({
  imports: [WebsitesModule],
  providers: [
    AccountService,
    AccountTemplateDefaultsService,
    AccountEventListener,
  ],
  controllers: [AccountController],
  exports: [AccountService, AccountTemplateDefaultsService],
})
export class AccountModule {}
