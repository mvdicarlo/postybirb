import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Account } from '../../drizzle/models';
import { PostyBirbDatabase } from '../../drizzle/postybirb-database/postybirb-database';
import { GetAccountsQuery } from './get-accounts.query';

@QueryHandler(GetAccountsQuery)
export class GetAccountsHandler implements IQueryHandler<GetAccountsQuery> {
  private readonly repository = new PostyBirbDatabase('AccountSchema');

  async execute(query: GetAccountsQuery): Promise<Account[]> {
    return this.repository.findAll();
  }
}
