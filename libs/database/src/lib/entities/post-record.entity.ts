import type {
    EntityId,
    IPostRecord,
    PostRecordDto,
    PostRecordResumeMode,
    PostRecordState,
    SubmissionId,
} from '@postybirb/types';
import type { InferSelectModel } from 'drizzle-orm';
import { HydrationContext } from '../repositories/base/hydration-context';
import type { PostRecordSchema } from '../schemas';
import { DatabaseEntity } from './database-entity';
import { PostEvent, type PostEventRow } from './post-event.entity';
import {
    PostQueueRecord,
    type PostQueueRecordRow,
} from './post-queue-record.entity';
import { Submission, type SubmissionRow } from './submission.entity';

export type PostRecordRow = InferSelectModel<typeof PostRecordSchema> & {
  submission?: SubmissionRow;
  origin?: PostRecordRow;
  chainedRecords?: PostRecordRow[];
  events?: PostEventRow[];
  postQueueRecord?: PostQueueRecordRow;
};

export class PostRecord
  extends DatabaseEntity<IPostRecord>
  implements IPostRecord
{
  public readonly entitySchemaKey = 'PostRecordSchema' as const;

  version?: string;

  postQueueRecordId!: EntityId;

  submissionId!: SubmissionId;

  submission!: Submission;

  originPostRecordId?: EntityId;

  origin?: PostRecord;

  chainedRecords?: PostRecord[];

  completedAt?: string;

  state!: PostRecordState;

  resumeMode!: PostRecordResumeMode;

  events!: PostEvent[];

  postQueueRecord!: PostQueueRecord;

  public toObject(): IPostRecord {
    return { ...this };
  }

  public toDTO(): PostRecordDto {
    return {
      ...this.toObject(),
      events: this.events?.map((e) => e.toDTO()),
      postQueueRecord: this.postQueueRecord?.toDTO(),
    } as unknown as PostRecordDto;
  }

  static fromRow(
    row: PostRecordRow,
    ctx: HydrationContext = new HydrationContext(),
  ): PostRecord {
    return ctx.getOrCreate(
      'PostRecordSchema',
      row.id,
      () => {
        const {
          submission,
          origin,
          chainedRecords,
          events,
          postQueueRecord,
          ...scalars
        } = row;
        return Object.assign(new PostRecord(), scalars);
      },
      (e) => {
        if (row.submission)
          e.submission = Submission.fromRow(row.submission, ctx);
        if (row.origin) e.origin = PostRecord.fromRow(row.origin, ctx);
        if (row.chainedRecords)
          e.chainedRecords = row.chainedRecords.map((c) =>
            PostRecord.fromRow(c, ctx),
          );
        if (row.events)
          e.events = row.events.map((ev) => PostEvent.fromRow(ev, ctx));
        if (row.postQueueRecord)
          e.postQueueRecord = PostQueueRecord.fromRow(row.postQueueRecord, ctx);
      },
    );
  }

  static fromRows(
    rows: readonly PostRecordRow[],
    ctx: HydrationContext = new HydrationContext(),
  ): PostRecord[] {
    return rows.map((r) => PostRecord.fromRow(r, ctx));
  }
}
