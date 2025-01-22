import {
  EntityPrimitive,
  IPostRecord,
  ISubmission,
  ISubmissionDto,
  ISubmissionMetadata,
  ISubmissionScheduleInfo,
  ScheduleType,
  SubmissionType,
} from '@postybirb/types';
import { instanceToPlain, Type } from 'class-transformer';
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

  toObject(): EntityPrimitive<ISubmission> {
    return instanceToPlain(this, {
      enableCircularCheck: true,
    }) as EntityPrimitive<ISubmission>;
  }

  toDTO(): ISubmissionDto {
    return this.toObject() as unknown as ISubmissionDto;
  }
}
