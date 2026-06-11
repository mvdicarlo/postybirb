import type { NodeStatus, SubmissionId } from '@postybirb/types';
import { NodeStatus as NodeStatusEnum } from '@postybirb/types';
import { getDatabase } from '../database';
import { PostJob } from '../entities/post-job.entity';
import { PostJobSchema } from '../schemas';
import { EntityRepository } from './base/entity-repository';

const TERMINAL_STATUSES: NodeStatus[] = [
  NodeStatusEnum.SUCCEEDED,
  NodeStatusEnum.FAILED,
  NodeStatusEnum.SKIPPED,
  NodeStatusEnum.CANCELLED,
];

export class PostJobRepository extends EntityRepository<
  'PostJobSchema',
  PostJob
> {
  constructor() {
    super({
      schemaKey: 'PostJobSchema',
      table: PostJobSchema,
      query: getDatabase().query.PostJobSchema,
      EntityClass: PostJob,
      defaultWith: {
        submission: true,
        tasks: { with: { units: true } },
      },
    });
  }

  /**
   * Active (non-terminal) jobs — used for crash recovery on boot and the live
   * posting UI. Eager-loads the full tree.
   */
  findActive(): Promise<PostJob[]> {
    return this.find({
      where: (job, { notInArray }) => notInArray(job.status, TERMINAL_STATUSES),
      orderBy: (job, { desc, asc }) => [desc(job.priority), asc(job.createdAt)],
      with: { submission: true, tasks: { with: { units: true } } },
    });
  }

  /** All jobs for a submission, newest first (post history). */
  findBySubmission(submissionId: SubmissionId): Promise<PostJob[]> {
    return this.find({
      where: (job, { eq }) => eq(job.submissionId, submissionId),
      orderBy: (job, { desc }) => desc(job.createdAt),
      with: { submission: true, tasks: { with: { units: true } } },
    });
  }
}
