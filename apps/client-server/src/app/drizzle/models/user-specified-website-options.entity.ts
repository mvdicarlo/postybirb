import {
  AccountId,
  DynamicObject,
  IUserSpecifiedWebsiteOptions,
  SubmissionType,
  UserSpecifiedWebsiteOptionsDto,
} from '@postybirb/types';
import { instanceToPlain, Type } from 'class-transformer';
import { Account } from './account.entity';
import { DatabaseEntity } from './database-entity';

export class UserSpecifiedWebsiteOptions
  extends DatabaseEntity
  implements IUserSpecifiedWebsiteOptions
{
  accountId: AccountId;

  @Type(() => Account)
  account: Account;

  type: SubmissionType;

  options: DynamicObject;

  toObject(): IUserSpecifiedWebsiteOptions {
    return instanceToPlain(this, {
      enableCircularCheck: true,
    }) as IUserSpecifiedWebsiteOptions;
  }

  toDTO(): UserSpecifiedWebsiteOptionsDto {
    return this.toObject() as unknown as UserSpecifiedWebsiteOptionsDto;
  }
}
