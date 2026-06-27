import { Module } from '@nestjs/common';
import { ProxyModule } from '../proxy/proxy.module';
import { WebsitesModule } from '../websites/websites.module';
import { AccountTemplateDefaultsService } from './account-template-defaults.service';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';

@Module({
  imports: [WebsitesModule, ProxyModule],
  providers: [AccountService, AccountTemplateDefaultsService],
  controllers: [AccountController],
  exports: [AccountService, AccountTemplateDefaultsService],
})
export class AccountModule {}
