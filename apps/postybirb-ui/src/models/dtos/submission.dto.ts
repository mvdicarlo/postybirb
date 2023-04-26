import { ISubmissionDto } from '@postybirb/dto';
import {
  IBaseWebsiteOptions,
  IBaseSubmissionMetadata,
  ISubmissionFile,
  ISubmissionOptions,
  ISubmissionScheduleInfo,
  ScheduleType,
  SubmissionType,
} from '@postybirb/types';
import { Moment } from 'moment';
import SubmissionsApi from '../../api/submission.api';

export class SubmissionDto<
  T extends IBaseSubmissionMetadata = IBaseSubmissionMetadata,
  O extends IBaseWebsiteOptions = IBaseWebsiteOptions
> implements ISubmissionDto<T>
{
  createdAt!: Date;

  files!: ISubmissionFile[];

  id!: string;

  isScheduled!: boolean;

  metadata!: T;

  options!: ISubmissionOptions<IBaseWebsiteOptions>[];

  schedule!: ISubmissionScheduleInfo;

  type!: SubmissionType;

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
    submission?: SubmissionDto<T, O>
  ): ISubmissionOptions<O> {
    return (submission || this).options.find(
      (o) => o.isDefault
    ) as ISubmissionOptions<O>;
  }

  public removeOption(option: ISubmissionOptions<O>) {
    const index = this.options.indexOf(option);
    if (index >= 0) {
      this.options.splice(index, 1);
    }
  }

  public updateSchedule(date: Moment | null) {
    return SubmissionsApi.update({
      id: this.id,
      isScheduled: this.isScheduled,
      scheduleType: ScheduleType.SINGLE,
      scheduledFor: date ? date.toISOString() : null,
    });
  }

  public copy(): SubmissionDto<T, O> {
    return new SubmissionDto(JSON.parse(JSON.stringify(this)));
  }

  public overwrite(from: SubmissionDto<T, O>) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Object.apply(this, from.copy() as any);
  }
}