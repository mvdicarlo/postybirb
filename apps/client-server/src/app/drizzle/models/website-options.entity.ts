import {
  AccountId,
  IWebsiteFormFields,
  IWebsiteOptions,
  SubmissionId,
  WebsiteOptionsDto
} from '@postybirb/types';
import { instanceToPlain, Type } from 'class-transformer';
import { BaseWebsiteOptions } from '../../websites/models/base-website-options';
import { Account } from './account.entity';
import { DatabaseEntity } from './database-entity';
import { Submission } from './submission.entity';

export class WebsiteOptions extends DatabaseEntity implements IWebsiteOptions {
  accountId: AccountId;

  submissionId: SubmissionId;

  @Type(() => Submission)
  submission: Submission;

  data: IWebsiteFormFields = new BaseWebsiteOptions();

  @Type(() => Account)
  account: Account;

  isDefault = false;

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
