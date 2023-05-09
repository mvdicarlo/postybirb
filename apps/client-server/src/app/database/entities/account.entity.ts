import {
  Collection,
  Entity,
  EntityRepositoryType,
  OneToMany,
  Property,
} from '@mikro-orm/core';
import { IAccount, IAccountDto, ISubmissionFields } from '@postybirb/types';
import { PostyBirbRepository } from '../repositories/postybirb-repository';
import { PostyBirbEntity } from './postybirb-entity';
import { SubmissionAccountData } from './submission-account-data.entity';

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

  @OneToMany(() => SubmissionAccountData, (so) => so.account, {
    orphanRemoval: true,
    lazy: true,
  })
  submissionAccountData = new Collection<
    SubmissionAccountData<ISubmissionFields>
  >(this);

  toJSON(
    externalProps?: Pick<IAccountDto, 'websiteInfo' | 'data' | 'loginState'>
  ): IAccountDto {
    return {
      ...super.toJSON(),
      name: this.name,
      website: this.website,
      groups: [...this.groups],
      loginState: externalProps.loginState ?? {
        username: 'Unknown',
        isLoggedIn: false,
        pending: false,
      },
      data: externalProps.data ?? {},
      websiteInfo: externalProps.websiteInfo ?? {
        websiteDisplayName: 'Unknown',
        supports: [],
      },
    };
  }
}
