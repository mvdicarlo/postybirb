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
  files?: SubmissionFileRow[];
  postQueueRecord?: PostQueueRecordRow;
};

export class Submission<T extends ISubmissionMetadata = ISubmissionMetadata>
  extends DatabaseEntity<ISubmission<T>>
  implements ISubmission<T>
{
  public readonly entitySchemaKey!: 'SubmissionSchema';

  public type: SubmissionType;

  public options!: WebsiteOptions[];

  public postQueueRecord?: PostQueueRecord;

  public isScheduled: boolean;

  public isTemplate: boolean;

  public isMultiSubmission: boolean;

  public isArchived: boolean;

  public isInitialized: boolean;

  public schedule: ISubmissionScheduleInfo;

  public files!: SubmissionFile[];

  public metadata: T;


  public order: number;

  constructor(init: Partial<ISubmission<T>> = {}) {
    super(init);
    Object.defineProperty(this, 'entitySchemaKey', {
      value: 'SubmissionSchema',
      enumerable: false,
      writable: false,
      configurable: false,
    });
    this.type = init.type ?? ('' as SubmissionType);
    this.isScheduled = init.isScheduled ?? false;
    this.isTemplate = init.isTemplate ?? false;
    this.isMultiSubmission = init.isMultiSubmission ?? false;
    this.isArchived = init.isArchived ?? false;
    this.isInitialized = init.isInitialized ?? false;
    this.schedule = init.schedule ?? { scheduleType: ScheduleType.NONE };
    this.metadata = (init.metadata ?? ({} as T)) as T;
    this.order = init.order ?? 0;
  }

  public toObject(): ISubmission<T> {
    return {
      id: this.id,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      type: this.type,
      options: this.options,
      postQueueRecord: this.postQueueRecord,
      isScheduled: this.isScheduled,
      isTemplate: this.isTemplate,
      isMultiSubmission: this.isMultiSubmission,
      isArchived: this.isArchived,
      isInitialized: this.isInitialized,
      schedule: this.schedule,
      files: this.files,
      metadata: this.metadata,
      order: this.order,
    } as ISubmission<T>;
  }

  public toDTO(): ISubmissionDto {
    const dto: ISubmissionDto = {
      ...(this.toObject() as unknown as ISubmissionDto),
      files: this.files?.map((f) => f.toDTO()),
      options: this.options?.map((o) => o.toDTO()),
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
      () => new Submission<TM>(row as unknown as Partial<ISubmission<TM>>),
      (e) => {
        if (row.options) e.options = ctx.hydrateMany(WebsiteOptions, row.options);
        if (row.files) e.files = ctx.hydrateMany(SubmissionFile, row.files);
        if (row.postQueueRecord) {
          e.postQueueRecord = ctx.hydrateOne(
            PostQueueRecord,
            row.postQueueRecord,
          );
        }
      },
    );
  }
}
