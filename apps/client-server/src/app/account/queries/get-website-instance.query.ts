import { IQuery } from '@nestjs/cqrs';
import { Account } from '../../drizzle/models';

export class GetWebsiteInstanceQuery implements IQuery {
  constructor(public readonly account: Account) {}
}
