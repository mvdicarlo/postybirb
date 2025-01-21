import {
  IPostRecord,
  PostRecordDto,
  PostRecordResumeMode,
  PostRecordState,
} from '@postybirb/types';
import { instanceToPlain, Transform, Type } from 'class-transformer';
import { DatabaseEntity } from './database-entity';
import { PostQueueRecord } from './post-queue-record.entity';
import { Submission } from './submission.entity';
import { WebsitePostRecord } from './website-post-record.entity';

export class PostRecord extends DatabaseEntity implements IPostRecord {
  @Type(() => Submission)
  parent: Submission;

  @Transform(({ value }) => (value ? new Date(value) : undefined), {
    toClassOnly: true,
  })
  @Transform(({ value }) => value?.toISOString(), {
    toPlainOnly: true,
  })
  completedAt?: Date;

  state: PostRecordState;

  resumeMode: PostRecordResumeMode;

  @Type(() => WebsitePostRecord)
  children: WebsitePostRecord[];

  @Type(() => PostQueueRecord)
  postQueueRecord?: PostQueueRecord;

  toObject(): IPostRecord {
    return instanceToPlain(this, {
      enableCircularCheck: true,
    }) as IPostRecord;
  }

  toDTO(): PostRecordDto {
    return this.toObject() as unknown as PostRecordDto;
  }
}
