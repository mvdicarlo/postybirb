import {
  EntityPrimitive,
  IPostQueueRecord,
  PostQueueRecordDto,
} from '@postybirb/types';
import { instanceToPlain, Type } from 'class-transformer';
import { DatabaseEntity } from './database-entity';
import { PostRecord } from './post-record.entity';
import { Submission } from './submission.entity';

export class PostQueueRecord
  extends DatabaseEntity
  implements IPostQueueRecord
{
  @Type(() => PostRecord)
  postRecord?: PostRecord;

  @Type(() => Submission)
  submission: Submission;

  toObject(): EntityPrimitive<IPostQueueRecord> {
    return instanceToPlain(this, {
      enableCircularCheck: true,
    }) as EntityPrimitive<IPostQueueRecord>;
  }

  toDTO(): PostQueueRecordDto {
    return this.toObject() as unknown as PostQueueRecordDto;
  }
}
