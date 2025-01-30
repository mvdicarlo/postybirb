import {
  EntityId,
  IPostRecord,
  PostRecordDto,
  PostRecordResumeMode,
  PostRecordState,
  SubmissionId
} from '@postybirb/types';
import { instanceToPlain, Type } from 'class-transformer';
import { DatabaseEntity } from './database-entity';
import { PostQueueRecord } from './post-queue-record.entity';
import { Submission } from './submission.entity';
import { WebsitePostRecord } from './website-post-record.entity';

export class PostRecord extends DatabaseEntity implements IPostRecord {
  postQueueRecordId: EntityId;

  submissionId: SubmissionId;

  @Type(() => Submission)
  parent: Submission;

  completedAt?: string;

  state: PostRecordState;

  resumeMode: PostRecordResumeMode;

  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(entity: Partial<IPostRecord>) {
    super(entity);
  }

  @Type(() => WebsitePostRecord)
  children: WebsitePostRecord[];

  @Type(() => PostQueueRecord)
  postQueueRecord: PostQueueRecord;

  toObject(): IPostRecord {
    return instanceToPlain(this, {
      enableCircularCheck: true,
    }) as IPostRecord;
  }

  toDTO(): PostRecordDto {
    return this.toObject() as unknown as PostRecordDto;
  }
}
