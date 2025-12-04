import { Account } from '../../drizzle/models';

export class AccountCreatedEvent {
  constructor(public readonly account: Account) {}
}
