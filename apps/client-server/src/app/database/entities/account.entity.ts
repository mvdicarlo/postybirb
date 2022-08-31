import { Entity, Property } from '@mikro-orm/core';
import { IAccount } from '../../account/models/account';
import { BaseEntity } from './base.entity';

@Entity()
export class Account extends BaseEntity<Account, 'id'> implements IAccount {
  @Property({ type: 'string', nullable: false })
  name: string;

  @Property({ nullable: false, type: 'string' })
  website: string;

  @Property({ type: 'array', default: [], nullable: false })
  groups: string[] = [];
}
