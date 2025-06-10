import {
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
import { PostRecord } from './post-record.entity';
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

  isArchived = false;

  schedule: ISubmissionScheduleInfo = {
    scheduleType: ScheduleType.NONE,
  };

  @Type(() => SubmissionFile)
  files: SubmissionFile[];

  metadata: T;

  @Type(() => PostRecord)
  posts: PostRecord[];

  order: number;

  constructor(entity: Partial<ISubmission<T>>) {
    super(entity);
    Object.assign(this, entity);
  }

  toObject(): ISubmission {
    return instanceToPlain(this, {
      enableCircularCheck: true,
    }) as ISubmission;
  }

  toDTO(): ISubmissionDto {
    const dto: ISubmissionDto = {
      ...this.toObject(),
      files: this.files?.map((file) => file.toDTO()),
      options: this.options?.map((option) => option.toDTO()),
      posts: this.posts?.map((post) => post.toDTO()),
      postQueueRecord: this.postQueueRecord?.toDTO(),
      validations: [],
    };

    return dto;
  }

  getSubmissionName(): string {
    if (this.options?.length) {
      return this.options.find((o) => o.isDefault)?.data.title;
    }
    return 'Unknown';
  }
}
