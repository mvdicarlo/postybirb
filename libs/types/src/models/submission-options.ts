import { IAccount } from './account';
import { IBaseEntity } from './base-entity';
import { IBaseSubmissionMetadata } from './base-submission-metadata';
import { BaseWebsiteOptions } from './base-website-options';
import { ISubmission } from './submission';

export interface ISubmissionOptions<
  T extends BaseWebsiteOptions = BaseWebsiteOptions
> extends IBaseEntity {
  id: string;
  submission: ISubmission<IBaseSubmissionMetadata>;
  data: T;
  account?: IAccount;
}
