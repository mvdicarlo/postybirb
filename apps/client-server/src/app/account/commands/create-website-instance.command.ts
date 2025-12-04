import { ICommand } from '@nestjs/cqrs';
import { Account } from '../../drizzle/models';

export class CreateWebsiteInstanceCommand implements ICommand {
  constructor(public readonly account: Account) {}
}
