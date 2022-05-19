import { IAccount } from '../../account/models/account';
import { SafeObject } from '../../shared/types/safe-object';
import BaseWebsiteOptions from './base-website-options';
import { ISubmission } from './submission';

export interface ISubmissionPart<T extends BaseWebsiteOptions> {
  id: string;
  submission: ISubmission<SafeObject>;
  data: T;
  account: IAccount;
}
