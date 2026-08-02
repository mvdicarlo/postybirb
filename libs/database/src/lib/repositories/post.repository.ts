import { getDatabase } from '../database';
import { Post } from '../entities/post.entity';
import { PostSchema } from '../schemas';
import { EntityRepository } from './base/entity-repository';

export class PostRepository extends EntityRepository<'PostSchema', Post> {
  constructor() {
    super({
      schemaKey: 'PostSchema',
      table: PostSchema,
      query: getDatabase().query.PostSchema,
      EntityClass: Post,
      defaultWith: { unitsOfWork: true },
    });
  }
}