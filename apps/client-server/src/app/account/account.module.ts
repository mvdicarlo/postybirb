import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { WebsitesModule } from '../websites/websites.module';
import { AccountBootstrapper } from './account.bootstrapper';
import { AccountCommandService } from './account.command.service';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';
import { ClearAccountDataHandler } from './commands/clear-account-data.handler';
import { CreateAccountHandler } from './commands/create-account.handler';
import { DeleteAccountHandler } from './commands/delete-account.handler';
import { EmitAccountUpdatesHandler } from './commands/emit-account-updates.handler';
import { SetAccountDataHandler } from './commands/set-account-data.handler';
import { TriggerAccountLoginHandler } from './commands/trigger-account-login.handler';
import { UpdateAccountHandler } from './commands/update-account.handler';
import { AccountCreatedHandler } from './events/account-created.handler';
import { GetAccountHandler } from './queries/get-account.handler';
import { GetAccountsHandler } from './queries/get-accounts.handler';

@Module({
  imports: [CqrsModule, WebsitesModule],
  providers: [
    AccountService,
    AccountCommandService,
    AccountBootstrapper,
    CreateAccountHandler,
    UpdateAccountHandler,
    DeleteAccountHandler,
    TriggerAccountLoginHandler,
    EmitAccountUpdatesHandler,
    ClearAccountDataHandler,
    SetAccountDataHandler,
    AccountCreatedHandler,
    GetAccountHandler,
    GetAccountsHandler,
  ],
  controllers: [AccountController],
  exports: [AccountService],
})
export class AccountModule {}
