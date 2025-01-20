import {
  IPostRecord,
  ISubmission,
  ISubmissionDto,
  ISubmissionMetadata,
  ISubmissionScheduleInfo,
  ScheduleType,
  SubmissionType,
} from '@postybirb/types';
import { instanceToPlain, plainToClass, Type } from 'class-transformer';
import { submission } from '../schemas';
import { DatabaseEntity } from './database-entity';
import { PostQueueRecord } from './post-queue-record.entity';
import { SubmissionFile } from './submission-file.entity';
import { WebsiteOptions } from './website-options.entity';

export class Submission<T extends ISubmissionMetadata = ISubmissionMetadata>
  extends DatabaseEntity
  implements ISubmission<T>
{
  type: SubmissionType;

  @Type(() => WebsiteOptions)
  options: WebsiteOptions[];

  @Type(() => PostQueueRecord)
  postQueueRecord?: PostQueueRecord;

  isScheduled = false;

  isTemplate = false;

  isMultiSubmission = false;

  schedule: ISubmissionScheduleInfo = {
    scheduleType: ScheduleType.NONE,
  };

  @Type(() => SubmissionFile)
  files: SubmissionFile[];

  metadata: T;

  posts: IPostRecord[];

  order: number;

  toObject(): ISubmission {
    return instanceToPlain(this, {
      enableCircularCheck: true,
    }) as ISubmission;
  }

  toDTO(): ISubmissionDto {
    return this.toObject() as unknown as ISubmissionDto;
  }

  static fromDBO(entity: typeof submission.$inferSelect): Submission {
    return plainToClass(Submission, entity, {
      enableCircularCheck: true,
    });
  }
}
