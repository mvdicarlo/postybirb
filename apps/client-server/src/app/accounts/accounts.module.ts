import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { accountProvider } from './providers/account.provider';

@Module({
  imports: [DatabaseModule],
  providers: [accountProvider],
})
export class AccountsModule {}
