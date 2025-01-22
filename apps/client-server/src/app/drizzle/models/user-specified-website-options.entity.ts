import {
  DynamicObject,
  EntityPrimitive,
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
  @Type(() => Account)
  account: Account;

  type: SubmissionType;

  options: DynamicObject;

  toObject(): EntityPrimitive<IUserSpecifiedWebsiteOptions> {
    return instanceToPlain(this, {
      enableCircularCheck: true,
    }) as EntityPrimitive<IUserSpecifiedWebsiteOptions>;
  }

  toDTO(): UserSpecifiedWebsiteOptionsDto {
    return this.toObject() as unknown as UserSpecifiedWebsiteOptionsDto;
  }
}
