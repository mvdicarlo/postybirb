import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AccountProvider } from './providers/account.provider';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';
import { WebsitesModule } from '../websites/websites.module';

@Module({
  imports: [DatabaseModule, WebsitesModule],
  providers: [AccountProvider, AccountService],
  controllers: [AccountController],
})
export class AccountModule {}
