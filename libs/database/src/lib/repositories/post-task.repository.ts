import type { EntityId } from '@postybirb/types';
import { getDatabase } from '../database';
import { PostTask } from '../entities/post-task.entity';
import { PostTaskSchema } from '../schemas';
import { EntityRepository } from './base/entity-repository';

export class PostTaskRepository extends EntityRepository<
  'PostTaskSchema',
  PostTask
> {
  constructor() {
    super({
      schemaKey: 'PostTaskSchema',
      table: PostTaskSchema,
      query: getDatabase().query.PostTaskSchema,
      EntityClass: PostTask,
      defaultWith: { units: true },
    });
  }

  /** All tasks for a job (with their units), ordered by creation. */
  findByJob(jobId: EntityId): Promise<PostTask[]> {
    return this.find({
      where: (task, { eq }) => eq(task.jobId, jobId),
      orderBy: (task, { asc }) => asc(task.createdAt),
      with: { units: true },
    });
  }
}
