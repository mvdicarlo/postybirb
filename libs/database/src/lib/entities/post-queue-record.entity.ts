import type {
  IPostQueueRecord,
  PostQueueRecordDto,
  SubmissionId,
} from '@postybirb/types';
import type { InferSelectModel } from 'drizzle-orm';
import { HydrationContext } from '../repositories/base/hydration-context';
import type { PostQueueRecordSchema } from '../schemas';
import { DatabaseEntity } from './database-entity';
import { Submission, type SubmissionRow } from './submission.entity';

export type PostQueueRecordRow = InferSelectModel<
  typeof PostQueueRecordSchema
> & {
  submission?: SubmissionRow;
};

export class PostQueueRecord
  extends DatabaseEntity<IPostQueueRecord>
  implements IPostQueueRecord
{
  public readonly entitySchemaKey!: 'PostQueueRecordSchema';

  public submissionId: SubmissionId;

  public submission!: Submission;

  constructor(init: Partial<IPostQueueRecord> = {}) {
    super(init);
    Object.defineProperty(this, 'entitySchemaKey', {
      value: 'PostQueueRecordSchema',
      enumerable: false,
      writable: false,
      configurable: false,
    });
    this.submissionId = init.submissionId ?? '';
  }

  public toObject(): IPostQueueRecord {
    return {
      id: this.id,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      submissionId: this.submissionId,
      submission: this.submission,
    };
  }

  public toDTO(): PostQueueRecordDto {
    return this.toObject() as unknown as PostQueueRecordDto;
  }

  static fromRow(
    row: PostQueueRecordRow,
    ctx: HydrationContext = new HydrationContext(),
  ): PostQueueRecord {
    return ctx.hydrate('PostQueueRecordSchema', row, PostQueueRecord, (e) => {
      if (row.submission) e.submission = ctx.hydrateOne(Submission, row.submission);
    });
  }
}
