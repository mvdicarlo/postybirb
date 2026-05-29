import { getDatabase } from '../database';
import { UserSpecifiedWebsiteOptions } from '../entities/user-specified-website-options.entity';
import { UserSpecifiedWebsiteOptionsSchema } from '../schemas';
import { EntityRepository } from './base/entity-repository';

export class UserSpecifiedWebsiteOptionsRepository extends EntityRepository<
  'UserSpecifiedWebsiteOptionsSchema',
  UserSpecifiedWebsiteOptions
> {
  constructor() {
    super({
      schemaKey: 'UserSpecifiedWebsiteOptionsSchema',
      table: UserSpecifiedWebsiteOptionsSchema,
      query: getDatabase().query.UserSpecifiedWebsiteOptionsSchema,
      EntityClass: UserSpecifiedWebsiteOptions,
    });
  }
}
