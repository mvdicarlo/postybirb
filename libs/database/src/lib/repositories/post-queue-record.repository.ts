import { getDatabase } from '../database';
import { PostQueueRecord } from '../entities/post-queue-record.entity';
import { PostQueueRecordSchema } from '../schemas';
import { EntityRepository } from './base/entity-repository';

export class PostQueueRecordRepository extends EntityRepository<
  'PostQueueRecordSchema',
  PostQueueRecord
> {
  constructor() {
    super({
      schemaKey: 'PostQueueRecordSchema',
      table: PostQueueRecordSchema,
      query: getDatabase().query.PostQueueRecordSchema,
      EntityClass: PostQueueRecord,
    });
  }
}
