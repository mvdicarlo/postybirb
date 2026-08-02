import { getDatabase } from '../database';
import { UnitOfWork } from '../entities/unit-of-work.entity';
import { UnitOfWorkSchema } from '../schemas';
import { EntityRepository } from './base/entity-repository';

export class UnitOfWorkRepository extends EntityRepository<
  'UnitOfWorkSchema',
  UnitOfWork
> {
  constructor() {
    super({
      schemaKey: 'UnitOfWorkSchema',
      table: UnitOfWorkSchema,
      query: getDatabase().query.UnitOfWorkSchema,
      EntityClass: UnitOfWork,
    });
  }
}