import {
  EntityId,
  IPostRecord,
  PostRecordDto,
  PostRecordResumeMode,
  PostRecordState,
  SubmissionId,
} from '@postybirb/types';
import { instanceToPlain, Type } from 'class-transformer';
import { DatabaseEntity } from './database-entity';
import { PostEvent } from './post-event.entity';
import { PostQueueRecord } from './post-queue-record.entity';
import { Submission } from './submission.entity';

export class PostRecord extends DatabaseEntity implements IPostRecord {
  postQueueRecordId: EntityId;

  submissionId: SubmissionId;

  @Type(() => Submission)
  submission: Submission;

  /**
   * Reference to the originating NEW PostRecord for this chain.
   * null for NEW records (they ARE the origin).
   */
  originPostRecordId?: EntityId;

  /**
   * The originating NEW PostRecord (resolved relation).
   */
  @Type(() => PostRecord)
  origin?: PostRecord;

  /**
   * All CONTINUE/RETRY PostRecords that chain to this origin.
   */
  @Type(() => PostRecord)
  chainedRecords?: PostRecord[];

  completedAt?: string;

  state: PostRecordState;

  resumeMode: PostRecordResumeMode;

  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(entity: Partial<IPostRecord>) {
    super(entity);
  }

  @Type(() => PostEvent)
  events: PostEvent[];

  @Type(() => PostQueueRecord)
  postQueueRecord: PostQueueRecord;

  toObject(): IPostRecord {
    return instanceToPlain(this, {
      enableCircularCheck: true,
    }) as IPostRecord;
  }

  toDTO(): PostRecordDto {
    const dto: PostRecordDto = {
      ...this.toObject(),
      events: this.events?.map((event) => event.toDTO()),
      postQueueRecord: this.postQueueRecord?.toDTO(),
    };
    return dto;
  }
}
