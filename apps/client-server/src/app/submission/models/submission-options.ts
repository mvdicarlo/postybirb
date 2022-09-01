import { IAccount } from '../../account/models/account';
import { IBaseEntity } from '../../database/models/base-entity';
import { SafeObject } from '../../shared/types/safe-object';
import { BaseOptions } from './base-website-options';
import { ISubmission } from './submission';

export interface ISubmissionOptions<T extends BaseOptions> extends IBaseEntity {
  id: string;
  submission: ISubmission<SafeObject>;
  data: T;
  account?: IAccount;
}
