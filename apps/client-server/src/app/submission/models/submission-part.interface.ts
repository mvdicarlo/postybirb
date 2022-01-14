import { IAccount } from '../../account/models/account.interface';
import { SafeObject } from '../../shared/types/safe-object.type';
import BaseWebsiteOptions from './base-website-options.model';
import { ISubmission } from './submission.interface';

export interface ISubmissionPart<T extends BaseWebsiteOptions> {
  id: string;
  submission: ISubmission<SafeObject>;
  data: T;
  account: IAccount;
}
