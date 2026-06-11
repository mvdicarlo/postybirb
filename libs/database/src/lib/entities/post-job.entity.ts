import type {
    EntityId,
    IPostJob,
    NodeStatus,
    PostJobDto,
    PostRecordResumeMode,
    SubmissionId,
} from '@postybirb/types';
import type { InferSelectModel } from 'drizzle-orm';
import { HydrationContext } from '../repositories/base/hydration-context';
import type { PostJobSchema } from '../schemas';
import { DatabaseEntity } from './database-entity';
import { PostTask, type PostTaskRow } from './post-task.entity';
import { Submission, type SubmissionRow } from './submission.entity';

export type PostJobRow = InferSelectModel<typeof PostJobSchema> & {
  submission?: SubmissionRow;
  origin?: PostJobRow;
  tasks?: PostTaskRow[];
};

export class PostJob extends DatabaseEntity<IPostJob> implements IPostJob {
  public readonly entitySchemaKey!: 'PostJobSchema';

  public version?: string;

  public submissionId: SubmissionId;

  public submission!: Submission;

  public attemptOf?: EntityId;

  public status: NodeStatus;

  public resumeMode: PostRecordResumeMode;

  public priority: number;

  public scheduledFor?: number;

  public completedAt?: string;

  public tasks!: PostTask[];

  constructor(init: Partial<IPostJob> = {}) {
    super(init);
    Object.defineProperty(this, 'entitySchemaKey', {
      value: 'PostJobSchema',
      enumerable: false,
      writable: false,
      configurable: false,
    });
    this.version = init.version;
    this.submissionId = init.submissionId ?? '';
    this.attemptOf = init.attemptOf;
    this.status = init.status ?? ('' as NodeStatus);
    this.resumeMode = init.resumeMode ?? ('' as PostRecordResumeMode);
    this.priority = init.priority ?? 0;
    this.scheduledFor = init.scheduledFor;
    this.completedAt = init.completedAt;
  }

  public toObject(): IPostJob {
    return {
      id: this.id,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      version: this.version,
      submissionId: this.submissionId,
      submission: this.submission,
      attemptOf: this.attemptOf,
      status: this.status,
      resumeMode: this.resumeMode,
      priority: this.priority,
      scheduledFor: this.scheduledFor,
      completedAt: this.completedAt,
      tasks: this.tasks,
    };
  }

  public toDTO(): PostJobDto {
    return {
      ...this.toObject(),
      tasks: this.tasks?.map((t) => t.toDTO()),
    } as unknown as PostJobDto;
  }

  static fromRow(
    row: PostJobRow,
    ctx: HydrationContext = new HydrationContext(),
  ): PostJob {
    return ctx.hydrate('PostJobSchema', row, PostJob, (e) => {
      if (row.submission) e.submission = ctx.hydrateOne(Submission, row.submission);
      if (row.tasks) e.tasks = ctx.hydrateMany(PostTask, row.tasks);
    });
  }
}
