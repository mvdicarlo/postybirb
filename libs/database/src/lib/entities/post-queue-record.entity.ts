import type {
    EntityId,
    IPostQueueRecord,
    PostQueueRecordDto,
    SubmissionId,
} from '@postybirb/types';
import type { InferSelectModel } from 'drizzle-orm';
import { HydrationContext } from '../repositories/base/hydration-context';
import type { PostQueueRecordSchema } from '../schemas';
import { DatabaseEntity } from './database-entity';
import { PostRecord, type PostRecordRow } from './post-record.entity';
import { Submission, type SubmissionRow } from './submission.entity';

export type PostQueueRecordRow = InferSelectModel<
  typeof PostQueueRecordSchema
> & {
  postRecord?: PostRecordRow;
  submission?: SubmissionRow;
};

export class PostQueueRecord
  extends DatabaseEntity<IPostQueueRecord>
  implements IPostQueueRecord
{
  public readonly entitySchemaKey = 'PostQueueRecordSchema' as const;

  postRecordId!: EntityId;

  submissionId!: SubmissionId;

  postRecord!: PostRecord;

  submission!: Submission;

  public toObject(): IPostQueueRecord {
    return { ...this };
  }

  public toDTO(): PostQueueRecordDto {
    return this.toObject() as unknown as PostQueueRecordDto;
  }

  static fromRow(
    row: PostQueueRecordRow,
    ctx: HydrationContext = new HydrationContext(),
  ): PostQueueRecord {
    return ctx.getOrCreate(
      'PostQueueRecordSchema',
      row.id,
      () => {
        const { postRecord, submission, ...scalars } = row;
        return Object.assign(new PostQueueRecord(), scalars);
      },
      (e) => {
        if (row.postRecord)
          e.postRecord = PostRecord.fromRow(row.postRecord, ctx);
        if (row.submission)
          e.submission = Submission.fromRow(row.submission, ctx);
      },
    );
  }

  static fromRows(
    rows: readonly PostQueueRecordRow[],
    ctx: HydrationContext = new HydrationContext(),
  ): PostQueueRecord[] {
    return rows.map((r) => PostQueueRecord.fromRow(r, ctx));
  }
}
