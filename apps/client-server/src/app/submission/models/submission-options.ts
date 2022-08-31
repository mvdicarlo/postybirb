import { IAccount } from '../../account/models/account';
import { SafeObject } from '../../shared/types/safe-object';
import { BaseOptions } from './base-website-options';
import { ISubmission } from './submission';

export interface ISubmissionOptions<T extends BaseOptions> {
  id: string;
  submission: ISubmission<SafeObject>;
  data: T;
  account: IAccount;
}
