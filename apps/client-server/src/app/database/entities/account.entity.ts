import {
  Collection,
  Entity,
  EntityRepositoryType,
  OneToMany,
  Property,
  serialize,
} from '@mikro-orm/core';
import {
  IAccount,
  IAccountDto,
  ILoginState,
  IWebsiteFormFields,
  IWebsiteInfo,
} from '@postybirb/types';
import { PostyBirbRepository } from '../repositories/postybirb-repository';
import { PostyBirbEntity } from './postybirb-entity';
import { WebsiteOptions } from './website-options.entity';

/** @inheritdoc */
@Entity({ customRepository: () => PostyBirbRepository })
export class Account extends PostyBirbEntity implements IAccount {
  [EntityRepositoryType]?: PostyBirbRepository<Account>;

  @Property({ type: 'string', nullable: false })
  name: string;

  @Property({ nullable: false, type: 'string' })
  website: string;

  @Property({ type: 'array', default: [], nullable: false })
  groups: string[] = [];

  @OneToMany(() => WebsiteOptions, (so) => so.account, {
    orphanRemoval: true,
    lazy: true,
    hidden: true,
  })
  submissionAccountData = new Collection<
    WebsiteOptions<IWebsiteFormFields>
  >(this);

  @Property({ persist: false })
  state: ILoginState = {
    username: 'Unknown',
    isLoggedIn: false,
    pending: false,
  };

  @Property({ persist: false })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any = {};

  @Property({ persist: false })
  websiteInfo: IWebsiteInfo = {
    websiteDisplayName: 'Unknown Display Name',
    supports: [],
  };

  toJSON(): IAccountDto {
    return serialize(this) as IAccountDto;
  }
}
