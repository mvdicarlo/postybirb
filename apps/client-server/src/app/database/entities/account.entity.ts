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
import { UserSpecifiedWebsiteOptions } from './user-specified-website-options.entity';
import { WebsiteOptions } from './website-options.entity';
import { WebsitePostRecord } from './website-post-record.entity';

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
  websiteOptions = new Collection<WebsiteOptions<IWebsiteFormFields>>(this);

  @OneToMany(() => UserSpecifiedWebsiteOptions, (so) => so.account, {
    orphanRemoval: true,
    lazy: true,
    hidden: true,
  })
  userSpecifiedWebsiteOptions = new Collection<UserSpecifiedWebsiteOptions>(
    this,
  );

  @OneToMany(() => WebsitePostRecord, (wpr) => wpr.account, {
    orphanRemoval: true,
    lazy: true,
    hidden: true,
  })
  websitePostRecords = new Collection<WebsitePostRecord>(this);

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

  constructor(account: Partial<IAccount> & Pick<IAccount, 'name' | 'website'>) {
    super();
    this.name = account.name;
    this.website = account.website;
    this.groups = account.groups;
  }

  // TODO: This is more of a hack as the "DTO" field is not properly typed.
  // Would either need to inject the instance type to correctly populate the fields
  // or just actually create a separate DTO typing.
  // I should really track down any other type hacks in the app since it feels
  // gross.
  toJSON(): IAccountDto {
    return serialize(this) as IAccountDto;
  }
}
