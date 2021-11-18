import { IAccount } from '../../account/models/account.interface';
import { SafeObject } from '../../shared/types/safe-object.type';
import { ISubmission } from './submission.interface';

export interface ISubmissionPart<T extends SafeObject> {
  id: string;
  submission: ISubmission<SafeObject>;
  data: T;
  account: IAccount;
}
