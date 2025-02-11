import { Module } from '@nestjs/common';
import { WebsitesModule } from '../websites/websites.module';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';

@Module({
  imports: [WebsitesModule],
  providers: [AccountService],
  controllers: [AccountController],
  exports: [AccountService],
})
export class AccountModule {}
