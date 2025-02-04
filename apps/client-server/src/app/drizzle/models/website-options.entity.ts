import {
  AccountId,
  IWebsiteFormFields,
  IWebsiteOptions,
  SubmissionId,
  WebsiteOptionsDto,
} from '@postybirb/types';
import { instanceToPlain, Type } from 'class-transformer';
import { BaseWebsiteOptions } from '../../websites/models/base-website-options';
import { Account } from './account.entity';
import { DatabaseEntity } from './database-entity';
import { Submission } from './submission.entity';

export class WebsiteOptions extends DatabaseEntity implements IWebsiteOptions {
  accountId: AccountId;

  @Type(() => Account)
  account: Account;

  submissionId: SubmissionId;

  @Type(() => Submission)
  submission: Submission;

  data: IWebsiteFormFields = new BaseWebsiteOptions();

  isDefault: boolean;

  constructor(entity: Partial<WebsiteOptions>) {
    super(entity);
    Object.assign(this, entity);
  }

  toObject(): IWebsiteOptions {
    return instanceToPlain(this, {
      enableCircularCheck: true,
    }) as IWebsiteOptions;
  }

  toDTO(): WebsiteOptionsDto {
    return {
      ...this.toObject(),
      submission: this.submission?.toDTO(),
    } as unknown as WebsiteOptionsDto;
  }
}
