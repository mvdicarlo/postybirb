import {
  DefaultDescriptionValue,
  DefaultTagValue,
  ISubmissionDto,
  ISubmissionFileDto,
  ISubmissionMetadata,
  ISubmissionScheduleInfo,
  IWebsiteFormFields,
  NULL_ACCOUNT_ID,
  ScheduleType,
  SubmissionRating,
  SubmissionType,
  WebsiteOptionsDto,
} from '@postybirb/types';
import { Moment } from 'moment';
import submissionsApi from '../../api/submission.api';

export class SubmissionDto<
  T extends ISubmissionMetadata = ISubmissionMetadata,
  O extends IWebsiteFormFields = IWebsiteFormFields
> implements ISubmissionDto<T>
{
  createdAt!: string;

  files!: ISubmissionFileDto[];

  id!: string;

  isScheduled!: boolean;

  metadata!: T;

  options!: WebsiteOptionsDto<IWebsiteFormFields>[];

  schedule!: ISubmissionScheduleInfo;

  type!: SubmissionType;

  updatedAt!: string;

  constructor(entity: ISubmissionDto) {
    Object.assign(this, entity);
    if (!this.options) {
      this.options = [
        {
          id: '',
          createdAt: '',
          updatedAt: '',
          submission: {} as ISubmissionDto,
          account: NULL_ACCOUNT_ID,
          isDefault: true,
          data: {
            title: '',
            tags: DefaultTagValue,
            description: DefaultDescriptionValue,
            rating: SubmissionRating.GENERAL,
          },
        },
      ];
    }
  }

  public hasValidScheduleTime(): boolean {
    return this.schedule.scheduledFor
      ? Date.now() <= new Date(this.schedule.scheduledFor).getTime()
      : true;
  }

  public getDefaultOptions(
    submission?: SubmissionDto<T, O>
  ): WebsiteOptionsDto<O> {
    return (submission || this).options.find(
      (o) => o.isDefault
    ) as WebsiteOptionsDto<O>;
  }

  public removeOption(option: WebsiteOptionsDto<O>) {
    const index = this.options.indexOf(option);
    if (index >= 0) {
      this.options.splice(index, 1);
    }
  }

  public updateSchedule(date: Moment | null) {
    return submissionsApi.update(this.id, {
      isScheduled: this.isScheduled,
      scheduleType: ScheduleType.SINGLE,
      scheduledFor: date ? date.toISOString() : undefined,
      metadata: this.metadata,
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
