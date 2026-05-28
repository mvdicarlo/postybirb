import type {
    ISubmission,
    ISubmissionDto,
    ISubmissionMetadata,
    ISubmissionScheduleInfo,
    SubmissionType,
} from '@postybirb/types';
import { ScheduleType } from '@postybirb/types';
import type { InferSelectModel } from 'drizzle-orm';
import { HydrationContext } from '../repositories/base/hydration-context';
import type { SubmissionSchema } from '../schemas';
import { DatabaseEntity } from './database-entity';
import {
    PostQueueRecord,
    type PostQueueRecordRow,
} from './post-queue-record.entity';
import { PostRecord, type PostRecordRow } from './post-record.entity';
import {
    SubmissionFile,
    type SubmissionFileRow,
} from './submission-file.entity';
import {
    WebsiteOptions,
    type WebsiteOptionsRow,
} from './website-options.entity';

export type SubmissionRow = InferSelectModel<typeof SubmissionSchema> & {
  options?: WebsiteOptionsRow[];
  posts?: PostRecordRow[];
  files?: SubmissionFileRow[];
  postQueueRecord?: PostQueueRecordRow;
};

export class Submission<T extends ISubmissionMetadata = ISubmissionMetadata>
  extends DatabaseEntity<ISubmission<T>>
  implements ISubmission<T>
{
  public readonly entitySchemaKey = 'SubmissionSchema' as const;

  type!: SubmissionType;

  options!: WebsiteOptions[];

  postQueueRecord?: PostQueueRecord;

  isScheduled = false;

  isTemplate = false;

  isMultiSubmission = false;

  isArchived = false;

  isInitialized = false;

  schedule: ISubmissionScheduleInfo = {
    scheduleType: ScheduleType.NONE,
  };

  files!: SubmissionFile[];

  metadata!: T;

  posts!: PostRecord[];

  order!: number;

  public toObject(): ISubmission<T> {
    return { ...this } as ISubmission<T>;
  }

  public toDTO(): ISubmissionDto {
    const dto: ISubmissionDto = {
      ...(this.toObject() as unknown as ISubmissionDto),
      files: this.files?.map((f) => f.toDTO()),
      options: this.options?.map((o) => o.toDTO()),
      posts: this.posts?.map((p) => p.toDTO()),
      postQueueRecord: this.postQueueRecord?.toDTO(),
      validations: [],
    };
    return dto;
  }

  getSubmissionName(): string {
    if (this.options?.length) {
      return this.options.find((o) => o.isDefault)?.data.title ?? 'Unknown';
    }
    return 'Unknown';
  }

  static fromRow<TM extends ISubmissionMetadata = ISubmissionMetadata>(
    row: SubmissionRow,
    ctx: HydrationContext = new HydrationContext(),
  ): Submission<TM> {
    return ctx.getOrCreate(
      'SubmissionSchema',
      row.id,
      () => {
        const { options, posts, files, postQueueRecord, ...scalars } = row;
        return Object.assign(new Submission<TM>(), scalars);
      },
      (e) => {
        if (row.options)
          e.options = row.options.map((o) => WebsiteOptions.fromRow(o, ctx));
        if (row.files)
          e.files = row.files.map((f) => SubmissionFile.fromRow(f, ctx));
        if (row.posts)
          e.posts = row.posts.map((p) => PostRecord.fromRow(p, ctx));
        if (row.postQueueRecord)
          e.postQueueRecord = PostQueueRecord.fromRow(
            row.postQueueRecord,
            ctx,
          );
      },
    );
  }

  static fromRows<TM extends ISubmissionMetadata = ISubmissionMetadata>(
    rows: readonly SubmissionRow[],
    ctx: HydrationContext = new HydrationContext(),
  ): Submission<TM>[] {
    return rows.map((r) => Submission.fromRow<TM>(r, ctx));
  }
}
