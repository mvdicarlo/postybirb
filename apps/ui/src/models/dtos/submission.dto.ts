import { ISubmissionDto } from '@postybirb/dto';
import {
  BaseWebsiteOptions,
  IBaseSubmissionMetadata,
  ISubmissionFile,
  ISubmissionOptions,
  ISubmissionScheduleInfo,
  ScheduleType,
} from '@postybirb/types';
import { Moment } from 'moment';
import SubmissionsApi from '../../api/submission.api';

export class SubmissionDto<
  T extends IBaseSubmissionMetadata = IBaseSubmissionMetadata,
  O extends BaseWebsiteOptions = BaseWebsiteOptions
> implements ISubmissionDto<T>
{
  createdAt!: Date;

  files!: ISubmissionFile[];

  id!: string;

  isScheduled!: boolean;

  metadata!: T;

  options!: ISubmissionOptions<BaseWebsiteOptions>[];

  schedule!: ISubmissionScheduleInfo;

  type!: 'MESSAGE' | 'FILE';

  updatedAt!: Date;

  constructor(entity: ISubmissionDto) {
    Object.assign(this, entity);
  }

  public hasValidScheduleTime(): boolean {
    return this.schedule.scheduledFor
      ? Date.now() <= new Date(this.schedule.scheduledFor).getTime()
      : true;
  }

  public getDefaultOptions(
    submission: SubmissionDto<T, O>
  ): ISubmissionOptions<O> {
    return submission.options.find((o) => !o.account) as ISubmissionOptions<O>;
  }

  public updateSchedule(date: Moment | null) {
    return SubmissionsApi.update(this.id, {
      isScheduled: this.isScheduled,
      scheduleType: ScheduleType.SINGLE,
      scheduledFor: date ? date.toISOString() : null,
    });
  }
}
