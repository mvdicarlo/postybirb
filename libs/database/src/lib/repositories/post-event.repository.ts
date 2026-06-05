import { getDatabase } from '../database';
import { PostEvent } from '../entities/post-event.entity';
import { PostEventSchema } from '../schemas';
import { EntityRepository } from './base/entity-repository';

/**
 * Repository for {@link PostEvent}. Eager-loads the related account
 * on every query by default.
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
