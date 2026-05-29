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
  public readonly entitySchemaKey!: 'PostRecordSchema';

  public version?: string;

  public postQueueRecordId: EntityId;

  public submissionId: SubmissionId;

  public submission!: Submission;

  public originPostRecordId?: EntityId;

  public origin?: PostRecord;

  public chainedRecords?: PostRecord[];

  public completedAt?: string;

  public state: PostRecordState;

  public resumeMode: PostRecordResumeMode;

  public events!: PostEvent[];

  public postQueueRecord!: PostQueueRecord;

  constructor(init: Partial<IPostRecord> = {}) {
    super(init);
    Object.defineProperty(this, 'entitySchemaKey', {
      value: 'PostRecordSchema',
      enumerable: false,
      writable: false,
      configurable: false,
    });
    this.version = init.version;
    this.postQueueRecordId = init.postQueueRecordId ?? '';
    this.submissionId = init.submissionId ?? '';
    this.originPostRecordId = init.originPostRecordId;
    this.completedAt = init.completedAt;
    this.state = init.state ?? ('' as PostRecordState);
    this.resumeMode = init.resumeMode ?? ('' as PostRecordResumeMode);
  }

  public toObject(): IPostRecord {
    return {
      id: this.id,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      version: this.version,
      postQueueRecordId: this.postQueueRecordId,
      submissionId: this.submissionId,
      submission: this.submission,
      originPostRecordId: this.originPostRecordId,
      origin: this.origin,
      chainedRecords: this.chainedRecords,
      completedAt: this.completedAt,
      state: this.state,
      resumeMode: this.resumeMode,
      events: this.events,
      postQueueRecord: this.postQueueRecord,
    };
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
      () => new PostRecord(row as unknown as Partial<IPostRecord>),
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
