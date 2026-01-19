import { ICommand } from '@nestjs/cqrs';
import { Account } from '../../../drizzle/models';

export class RemoveWebsiteInstanceCommand implements ICommand {
  constructor(public readonly account: Account) {}
}
