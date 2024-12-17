import {
  Entity,
  EntityRepositoryType,
  ManyToOne,
  Property,
  serialize,
} from '@mikro-orm/core';
import {
  IAccount,
  IPostRecord,
  IPostRecordMetadata,
  IWebsiteError,
  IWebsitePostRecord,
  PostData,
  WebsitePostRecordDto,
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
  [EntityRepositoryType]?: PostyBirbRepository<WebsitePostRecord>;

  @ManyToOne({
    entity: () => PostRecord,
    nullable: false,
    inversedBy: 'children',
    lazy: true,
    serializer: (s) => s.id,
  })
  parent: IPostRecord;

  @Property({ type: 'json', nullable: false })
  metadata: IPostRecordMetadata = {
    sourceMap: {},
    postedFiles: [],
    nextBatchNumber: 1,
  };

  @Property({
    type: 'date',
    nullable: true,
    serializer: (value) => value?.toISOString(),
  })
  completedAt: Date;

  @ManyToOne({ entity: () => Account, nullable: false })
  account: IAccount;

  @Property({ type: 'json', nullable: true })
  errors?: IWebsiteError[];

  @Property({ type: 'json', nullable: true })
  postData?: PostData;

  toJSON(): WebsitePostRecordDto {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return serialize(this as any, {
      populate: ['account'],
    }) as WebsitePostRecordDto;
  }
}
