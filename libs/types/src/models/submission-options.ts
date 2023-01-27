import { IAccount } from './account';
import { IBaseEntity } from './base-entity';
import { IBaseSubmissionMetadata } from './base-submission-metadata';
import { IBaseWebsiteOptions } from './base-website-options';
import { ISubmission } from './submission';

export interface ISubmissionOptions<
  T extends IBaseWebsiteOptions = IBaseWebsiteOptions
> extends IBaseEntity {
  id: string;
  submission: ISubmission<IBaseSubmissionMetadata>;
  data: T;
  account?: IAccount;
  isDefault: boolean;
}
