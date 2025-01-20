import {
  DynamicObject,
  IUserSpecifiedWebsiteOptions,
  SubmissionType,
  UserSpecifiedWebsiteOptionsDto,
} from '@postybirb/types';
import { instanceToPlain, plainToClass, Type } from 'class-transformer';
import { userSpecifiedWebsiteOptions } from '../schemas';
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

  toObject(): IUserSpecifiedWebsiteOptions {
    return instanceToPlain(this, {
      enableCircularCheck: true,
    }) as IUserSpecifiedWebsiteOptions;
  }

  toDTO(): UserSpecifiedWebsiteOptionsDto {
    return this.toObject() as unknown as UserSpecifiedWebsiteOptionsDto;
  }

  static fromDBO(
    entity: typeof userSpecifiedWebsiteOptions.$inferSelect,
  ): UserSpecifiedWebsiteOptions {
    return plainToClass(UserSpecifiedWebsiteOptions, entity, {
      enableCircularCheck: true,
    });
  }
}
