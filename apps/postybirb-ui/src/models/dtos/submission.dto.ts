import { i18n } from '@lingui/core';
import { msg } from '@lingui/macro';
import {
  DefaultDescriptionValue,
  DefaultTagValue,
  IAccountDto,
  IPostQueueRecord,
  ISubmissionDto,
  ISubmissionFileDto,
  ISubmissionMetadata,
  ISubmissionScheduleInfo,
  IWebsiteFormFields,
  NULL_ACCOUNT_ID,
  PostRecordDto,
  ScheduleType,
  SubmissionRating,
  SubmissionType,
  ValidationResult,
  WebsiteOptionsDto,
} from '@postybirb/types';
import { Moment } from 'moment';
import submissionsApi from '../../api/submission.api';

export class SubmissionDto<
  T extends ISubmissionMetadata = ISubmissionMetadata,
  O extends IWebsiteFormFields = IWebsiteFormFields,
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

  posts!: PostRecordDto[];

  order!: number;

  validations!: ValidationResult[];

  private defaultOption?: WebsiteOptionsDto;

  isTemplate!: boolean;

  isMultiSubmission!: boolean;

  isArchived!: boolean;

  postQueueRecord?: IPostQueueRecord | undefined;

  constructor(entity: ISubmissionDto) {
    Object.assign(this, entity);
    this.files = this.files ?? [];
    this.posts = this.posts ?? [];
    this.metadata = this.metadata ?? ({} as T);
    this.order = this.order ?? 0;
    this.validations = this.validations ?? [];
    if (!this.options) {
      this.options = [
        {
          id: '',
          createdAt: '',
          updatedAt: '',
          submission: {} as ISubmissionDto,
          accountId: NULL_ACCOUNT_ID,
          account: {} as IAccountDto,
          isDefault: true,
          data: {
            title: '',
            tags: DefaultTagValue(),
            description: DefaultDescriptionValue(),
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

  public getDefaultOptions(): WebsiteOptionsDto<O> {
    if (!this.defaultOption) {
      this.defaultOption = this.options.find(
        (o) => o.isDefault,
      ) as WebsiteOptionsDto<O>;
    }
    return this.defaultOption as WebsiteOptionsDto<O>;
  }

  public removeOption(option: WebsiteOptionsDto<O>) {
    this.options = this.options.filter((opt) => opt.id !== option.id);
  }

  public addOption(option: WebsiteOptionsDto<O>) {
    this.options = [...this.options, option];
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

  public getTemplateName() {
    return this.metadata.template?.name ?? i18n.t(msg`Template`);
  }

  public isQueued(): boolean {
    return this.postQueueRecord !== undefined;
  }
}
