import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Account } from '../../drizzle/models';
import { PostyBirbDatabase } from '../../drizzle/postybirb-database/postybirb-database';
import { GetAccountQuery } from './get-account.query';

@QueryHandler(GetAccountQuery)
export class GetAccountHandler implements IQueryHandler<GetAccountQuery> {
  private readonly repository = new PostyBirbDatabase('AccountSchema');

  async execute(query: GetAccountQuery): Promise<Account> {
    return this.repository.findById(query.id);
  }
}
