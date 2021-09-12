import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { accountProvider } from './providers/account.provider';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';

@Module({
  imports: [DatabaseModule],
  providers: [accountProvider, AccountService],
  controllers: [AccountController],
})
export class AccountModule {}
