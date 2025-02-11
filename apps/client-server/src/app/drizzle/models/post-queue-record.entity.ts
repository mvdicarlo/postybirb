import {
  EntityId,
  IPostQueueRecord,
  PostQueueRecordDto,
  SubmissionId
} from '@postybirb/types';
import { instanceToPlain, Type } from 'class-transformer';
import { DatabaseEntity } from './database-entity';
import { PostRecord } from './post-record.entity';
import { Submission } from './submission.entity';

export class PostQueueRecord
  extends DatabaseEntity
  implements IPostQueueRecord
{
  postRecordId: EntityId;

  submissionId: SubmissionId;

  @Type(() => PostRecord)
  postRecord: PostRecord;

  @Type(() => Submission)
  submission: Submission;

  toObject(): IPostQueueRecord {
    return instanceToPlain(this, {
      enableCircularCheck: true,
    }) as IPostQueueRecord;
  }

  toDTO(): PostQueueRecordDto {
    return this.toObject() as unknown as PostQueueRecordDto;
  }
}
