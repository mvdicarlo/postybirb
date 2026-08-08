import { PostId, UnitOfWorkState } from '@postybirb/types';
import { and, eq, ne, notInArray } from 'drizzle-orm';
import { getDatabase } from '../database';
import { Post } from '../entities/post.entity';
import { PostSchema, UnitOfWorkSchema } from '../schemas';
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

  public async completeIfAllActiveUnitsSettled(
    postId: PostId,
  ): Promise<boolean> {
    return this.db.transaction((tx) => {
      const outstandingUnit = tx
        .select({ id: UnitOfWorkSchema.id })
        .from(UnitOfWorkSchema)
        .where(
          and(
            eq(UnitOfWorkSchema.postId, postId),
            eq(UnitOfWorkSchema.evicted, false),
            notInArray(UnitOfWorkSchema.state, [
              UnitOfWorkState.SUCCEEDED,
              UnitOfWorkState.FAILED,
            ]),
          ),
        )
        .limit(1)
        .get();

      if (outstandingUnit) {
        return false;
      }

      const result = tx
        .update(PostSchema)
        .set({ completed: true })
        .where(eq(PostSchema.id, postId))
        .run();
      return result.changes > 0;
    });
  }

  public async cancel(postId: PostId): Promise<void> {
    this.db.transaction((tx) => {
      tx.update(PostSchema)
        .set({ completed: true, cancelled: true })
        .where(eq(PostSchema.id, postId))
        .run();

      tx.update(UnitOfWorkSchema)
        .set({ state: UnitOfWorkState.CANCELLED })
        .where(
          and(
            eq(UnitOfWorkSchema.postId, postId),
            eq(UnitOfWorkSchema.evicted, false),
            ne(UnitOfWorkSchema.state, UnitOfWorkState.SUCCEEDED),
          ),
        )
        .run();
    });
  }
}
