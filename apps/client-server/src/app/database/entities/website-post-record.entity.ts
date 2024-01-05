import { Entity, ManyToOne, Property } from '@mikro-orm/core';
import {
  IAccount,
  IPostRecord,
  IPostRecordMetadata,
  IWebsiteError,
  IWebsitePostRecord,
} from '@postybirb/types';
import { PostyBirbRepository } from '../repositories/postybirb-repository';
import { Account } from './account.entity';
import { PostRecord } from './post-record.entity';
import { PostyBirbEntity } from './postybirb-entity';

/** @inheritdoc */
@Entity({ customRepository: () => PostyBirbRepository })
export class WebsitePostRecord
  extends PostyBirbEntity
  implements IWebsitePostRecord
{
  @ManyToOne({
    entity: () => PostRecord,
    nullable: false,
    inversedBy: 'children',
    lazy: true,
  })
  parent: IPostRecord;

  @Property({ type: 'json', nullable: false })
  metadata: IPostRecordMetadata;

  @Property({
    type: 'date',
    nullable: true,
    serializer: (value) => value.toISOString(),
  })
  completedAt: Date;

  @ManyToOne({ entity: () => Account, nullable: false })
  account: IAccount;

  @Property({ type: 'json', nullable: true })
  error?: IWebsiteError;
}
