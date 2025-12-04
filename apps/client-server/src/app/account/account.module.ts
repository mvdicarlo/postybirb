import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { WebsitesModule } from '../websites/websites.module';
import { AccountCommandService } from './account.command.service';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';
import { CreateAccountHandler } from './commands/create-account.handler';
import { EmitAccountUpdatesHandler } from './commands/emit-account-updates.handler';
import { TriggerAccountLoginHandler } from './commands/trigger-account-login.handler';
import { AccountCreatedHandler } from './events/account-created.handler';
import { GetAccountHandler } from './queries/get-account.handler';
import { GetAccountsHandler } from './queries/get-accounts.handler';

@Module({
  imports: [CqrsModule, WebsitesModule],
  providers: [
    AccountService,
    AccountCommandService,
    CreateAccountHandler,
    TriggerAccountLoginHandler,
    EmitAccountUpdatesHandler,
    AccountCreatedHandler,
    GetAccountHandler,
    GetAccountsHandler,
  ],
  controllers: [AccountController],
  exports: [AccountService],
})
export class AccountModule {}
