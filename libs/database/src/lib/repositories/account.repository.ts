import { getDatabase } from '../database';
import { Account } from '../entities/account.entity';
import { AccountSchema } from '../schemas';
import { EntityRepository } from './base/entity-repository';

/**
 * Repository for {@link Account}. No `defaultWith` — most callers
 * read accounts without eager-loading related schemas.
 */
export class AccountRepository extends EntityRepository<'AccountSchema', Account> {
  constructor() {
    super({
      schemaKey: 'AccountSchema',
      table: AccountSchema,
      query: getDatabase().query.AccountSchema,
      EntityClass: Account,
    });
  }
}
