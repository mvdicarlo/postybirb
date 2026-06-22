import { Module } from '@nestjs/common';
import { ProxyModule } from '../proxy/proxy.module';
import { WebsitesModule } from '../websites/websites.module';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';

@Module({
  imports: [WebsitesModule, ProxyModule],
  providers: [AccountService],
  controllers: [AccountController],
  exports: [AccountService],
})
export class AccountModule {}
