import type { EntityId } from '@postybirb/types';
import { getDatabase } from '../database';
import { PostUnit } from '../entities/post-unit.entity';
import { PostUnitSchema } from '../schemas';
import { EntityRepository } from './base/entity-repository';

export class PostUnitRepository extends EntityRepository<
  'PostUnitSchema',
  PostUnit
> {
  constructor() {
    super({
      schemaKey: 'PostUnitSchema',
      table: PostUnitSchema,
      query: getDatabase().query.PostUnitSchema,
      EntityClass: PostUnit,
    });
  }

  /** All units for a task, ordered by batch ordinal. */
  findByTask(taskId: EntityId): Promise<PostUnit[]> {
    return this.find({
      where: (unit, { eq }) => eq(unit.taskId, taskId),
      orderBy: (unit, { asc }) => asc(unit.ordinal),
    });
  }
}
