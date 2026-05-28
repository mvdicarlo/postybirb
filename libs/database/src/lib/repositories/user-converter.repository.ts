import { getDatabase } from '../database';
import { UserConverter } from '../entities/user-converter.entity';
import { UserConverterSchema } from '../schemas';
import { EntityRepository } from './base/entity-repository';

export class UserConverterRepository extends EntityRepository<
  'UserConverterSchema',
  UserConverter
> {
  constructor() {
    super({
      schemaKey: 'UserConverterSchema',
      table: UserConverterSchema,
      query: getDatabase().query.UserConverterSchema,
      EntityClass: UserConverter,
    });
  }
}
