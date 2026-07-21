import { getDatabase } from '../database';
import { PostRateWindow } from '../entities/post-rate-window.entity';
import { PostRateWindowSchema } from '../schemas';
import { EntityRepository } from './base/entity-repository';

export class PostRateWindowRepository extends EntityRepository<
  'PostRateWindowSchema',
  PostRateWindow
> {
  constructor() {
    super({
      schemaKey: 'PostRateWindowSchema',
      table: PostRateWindowSchema,
      query: getDatabase().query.PostRateWindowSchema,
      EntityClass: PostRateWindow,
    });
  }

  /** Look up a window by its bucket key. */
  findByKey(key: string): Promise<PostRateWindow | null> {
    return this.findOne({ where: (w, { eq }) => eq(w.key, key) });
  }
}
