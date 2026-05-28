import { PostRecord } from '../entities/post-record.entity';
import { getDatabase } from '../database';
import { PostRecordSchema } from '../schemas';
import { EntityRepository } from './base/entity-repository';

export class PostRecordRepository extends EntityRepository<
  'PostRecordSchema',
  PostRecord
> {
  constructor() {
    super({
      schemaKey: 'PostRecordSchema',
      table: PostRecordSchema,
      query: getDatabase().query.PostRecordSchema,
      EntityClass: PostRecord,
    });
  }
}
