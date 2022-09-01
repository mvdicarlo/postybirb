import { Entity, OneToMany, Property } from '@mikro-orm/core';
import { IAccount } from '../../account/models/account';
import { BaseWebsiteOptions } from '../../submission/models/base-website-options';
import { BaseEntity } from './base.entity';
import { SubmissionOptions } from './submission-options.entity';

@Entity()
export class Account extends BaseEntity<Account, 'id'> implements IAccount {
  @Property({ type: 'string', nullable: false })
  name: string;

  @Property({ nullable: false, type: 'string' })
  website: string;

  @Property({ type: 'array', default: [], nullable: false })
  groups: string[] = [];

  @OneToMany(() => SubmissionOptions, (so) => so.account, {
    orphanRemoval: true,
  })
  submissionOptions: SubmissionOptions<BaseWebsiteOptions>;
}
