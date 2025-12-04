import { Injectable } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Account } from '../drizzle/models';
import { ClearAccountDataCommand } from './commands/clear-account-data/clear-account-data.command';
import { CreateAccountCommand } from './commands/create-account/create-account.command';
import { DeleteAccountCommand } from './commands/delete-account/delete-account.command';
import { SetAccountDataCommand } from './commands/set-account-data/set-account-data.command';
import { TriggerAccountLoginCommand } from './commands/trigger-account-login/trigger-account-login.command';
import { UpdateAccountCommand } from './commands/update-account/update-account.command';
import { CreateAccountDto } from './dtos/create-account.dto';
import { SetWebsiteDataRequestDto } from './dtos/set-website-data-request.dto';
import { UpdateAccountDto } from './dtos/update-account.dto';
import { GetAccountQuery } from './queries/get-account/get-account.query';
import { GetAccountsQuery } from './queries/get-accounts/get-accounts.query';

@Injectable()
export class AccountCommandService {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  public async createAccount(newAccount: CreateAccountDto): Promise<Account> {
    return this.commandBus.execute(new CreateAccountCommand(newAccount));
  }

  public async updateAccount(
    id: string,
    updateAccountDto: UpdateAccountDto,
  ): Promise<Account> {
    return this.commandBus.execute(
      new UpdateAccountCommand(id, updateAccountDto),
    );
  }

  public async deleteAccount(id: string): Promise<void> {
    return this.commandBus.execute(new DeleteAccountCommand(id));
  }

  public async triggerLogin(id: string): Promise<void> {
    return this.commandBus.execute(new TriggerAccountLoginCommand(id));
  }

  public async clearAccountData(id: string): Promise<void> {
    return this.commandBus.execute(new ClearAccountDataCommand(id));
  }

  public async setAccountData(dto: SetWebsiteDataRequestDto): Promise<void> {
    return this.commandBus.execute(new SetAccountDataCommand(dto));
  }

  public async getAccount(id: string): Promise<Account> {
    return this.queryBus.execute(new GetAccountQuery(id));
  }

  public async getAccounts(): Promise<Account[]> {
    return this.queryBus.execute(new GetAccountsQuery());
  }
}
