import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';
import { WebsitesModule } from '../websites/websites.module';

@Module({
  imports: [DatabaseModule, WebsitesModule],
  providers: [AccountService],
  controllers: [AccountController],
  exports: [AccountService],
})
export class AccountModule {}
