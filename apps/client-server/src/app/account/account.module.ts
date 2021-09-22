import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { accountProvider } from './providers/account.provider';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';
import { WebsitesModule } from '../websites/websites.module';
import { AccountLoginStateService } from './account-login-state/account-login-state.service';

@Module({
  imports: [DatabaseModule, WebsitesModule],
  providers: [accountProvider, AccountService, AccountLoginStateService],
  controllers: [AccountController],
})
export class AccountModule {}
