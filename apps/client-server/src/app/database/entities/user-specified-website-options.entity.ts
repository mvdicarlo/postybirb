import {
  Entity,
  EntityRepositoryType,
  JsonType,
  ManyToOne,
  Property,
  Rel,
  serialize,
} from '@mikro-orm/core';
import {
  DynamicObject,
  IUserSpecifiedWebsiteOptions,
  SubmissionType,
  UserSpecifiedWebsiteOptionsDto,
} from '@postybirb/types';
import { PostyBirbRepository } from '../repositories/postybirb-repository';
import { Account } from './account.entity';
import { PostyBirbEntity } from './postybirb-entity';

/** @inheritdoc */
@Entity({ customRepository: () => PostyBirbRepository })
export class UserSpecifiedWebsiteOptions
  extends PostyBirbEntity
  implements IUserSpecifiedWebsiteOptions
{
  [EntityRepositoryType]?: PostyBirbRepository<UserSpecifiedWebsiteOptions>;

  @ManyToOne(() => Account, {
    nullable: false,
    serializer: (account) => account.id,
  })
  account: Rel<Account>;

  @Property({ nullable: false })
  type: SubmissionType;

  @Property({ type: JsonType, nullable: false })
  options: DynamicObject;

  toJSON(): UserSpecifiedWebsiteOptionsDto {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return serialize(this as any, {
      populate: true,
    }) as UserSpecifiedWebsiteOptionsDto;
  }
}
