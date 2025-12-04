import { Injectable } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Account } from '../drizzle/models';
import { CreateAccountCommand } from './commands/create-account.command';
import { CreateAccountDto } from './dtos/create-account.dto';
import { GetAccountQuery } from './queries/get-account.query';
import { GetAccountsQuery } from './queries/get-accounts.query';

@Injectable()
export class AccountCommandService {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  public async createAccount(newAccount: CreateAccountDto): Promise<Account> {
    return this.commandBus.execute(new CreateAccountCommand(newAccount));
  }

  public async getAccount(id: string): Promise<Account> {
    return this.queryBus.execute(new GetAccountQuery(id));
  }

  public async getAccounts(): Promise<Account[]> {
    return this.queryBus.execute(new GetAccountsQuery());
  }
}
