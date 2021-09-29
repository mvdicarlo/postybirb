import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { accountProvider } from './providers/account.provider';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';
import { WebsitesModule } from '../websites/websites.module';

@Module({
  imports: [DatabaseModule, WebsitesModule],
  providers: [accountProvider, AccountService],
  controllers: [AccountController],
})
export class AccountModule {}
