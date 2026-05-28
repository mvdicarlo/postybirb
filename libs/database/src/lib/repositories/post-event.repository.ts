import { PostEvent } from '../entities/post-event.entity';
import { getDatabase } from '../database';
import { PostEventSchema } from '../schemas';
import { EntityRepository } from './base/entity-repository';

/**
 * Default eager-load mirrors the legacy
 * `apps/client-server/src/app/post/services/post-record-factory/post-event.repository.ts`
 * consumer which always reads the related account.
 */
export class PostEventRepository extends EntityRepository<
  'PostEventSchema',
  PostEvent
> {
  constructor() {
    super({
      schemaKey: 'PostEventSchema',
      table: PostEventSchema,
      query: getDatabase().query.PostEventSchema,
      EntityClass: PostEvent,
      defaultWith: { account: true },
    });
  }
}
