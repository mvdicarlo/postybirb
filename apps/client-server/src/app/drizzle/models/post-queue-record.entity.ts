import {
    IPostQueueRecord,
    IPostRecord,
    PostQueueRecordDto,
} from '@postybirb/types';
import { instanceToPlain, plainToClass, Type } from 'class-transformer';
import { postQueueRecord } from '../schemas';
import { DatabaseEntity } from './database-entity';
import { Submission } from './submission.entity';

export class PostQueueRecord
  extends DatabaseEntity
  implements IPostQueueRecord
{
  postRecord?: IPostRecord;

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

  toJson(): string {
    return JSON.stringify(this.toObject());
  }

  static fromDBO(entity: typeof postQueueRecord.$inferSelect): PostQueueRecord {
    return plainToClass(PostQueueRecord, entity, {
      enableCircularCheck: true,
    });
  }
}
