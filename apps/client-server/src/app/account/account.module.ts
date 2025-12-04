import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { WebsitesModule } from '../websites/websites.module';
import { AccountBootstrapper } from './account.bootstrapper';
import { AccountCommandService } from './account.command.service';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';
import { ClearAccountDataHandler } from './commands/clear-account-data/clear-account-data.handler';
import { CreateAccountHandler } from './commands/create-account/create-account.handler';
import { CreateWebsiteInstanceHandler } from './commands/create-website-instance/create-website-instance.handler';
import { DeleteAccountHandler } from './commands/delete-account/delete-account.handler';
import { EmitAccountUpdatesHandler } from './commands/emit-account-updates/emit-account-updates.handler';
import { EmitWebsiteUpdatesHandler } from './commands/emit-website-updates/emit-website-updates.handler';
import { RemoveWebsiteInstanceHandler } from './commands/remove-website-instance/remove-website-instance.handler';
import { SetAccountDataHandler } from './commands/set-account-data/set-account-data.handler';
import { TriggerAccountLoginHandler } from './commands/trigger-account-login/trigger-account-login.handler';
import { UpdateAccountHandler } from './commands/update-account/update-account.handler';
import { AccountCreatedHandler } from './events/account-created/account-created.handler';
import { CanCreateWebsiteHandler } from './queries/can-create-website/can-create-website.handler';
import { GetAccountHandler } from './queries/get-account/get-account.handler';
import { GetAccountsHandler } from './queries/get-accounts/get-accounts.handler';
import { GetWebsiteInstanceHandler } from './queries/get-website-instance/get-website-instance.handler';

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
    GetWebsiteInstanceHandler,
    CanCreateWebsiteHandler,
    CreateWebsiteInstanceHandler,
    RemoveWebsiteInstanceHandler,
    EmitWebsiteUpdatesHandler,
  ],
  controllers: [AccountController],
  exports: [AccountService],
})
export class AccountModule {}
