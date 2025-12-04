import { Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Account } from '../drizzle/models';
import { CreateAccountCommand } from './commands/create-account.command';
import { CreateAccountDto } from './dtos/create-account.dto';

@Injectable()
export class AccountCommandService {
  constructor(private readonly commandBus: CommandBus) {}

  public async createAccount(newAccount: CreateAccountDto): Promise<Account> {
    return this.commandBus.execute(new CreateAccountCommand(newAccount));
  }
}
