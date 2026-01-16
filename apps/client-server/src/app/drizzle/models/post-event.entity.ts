import {
    AccountId,
    EntityId,
    IPostEvent,
    IPostEventError,
    IPostEventMetadata,
    PostEventDto,
    PostEventType,
} from '@postybirb/types';
import { instanceToPlain, Type } from 'class-transformer';
import { Account } from './account.entity';
import { DatabaseEntity } from './database-entity';
import { PostRecord } from './post-record.entity';

export class PostEvent extends DatabaseEntity implements IPostEvent {
  postRecordId: EntityId;

  accountId?: AccountId;

  eventType: PostEventType;

  fileId?: EntityId;

  sourceUrl?: string;

  error?: IPostEventError;

  metadata?: IPostEventMetadata;

  @Type(() => PostRecord)
  postRecord: PostRecord;

  @Type(() => Account)
  account?: Account;

  constructor(entity: Partial<IPostEvent>) {
    super(entity);
    Object.assign(this, entity);
  }

  toObject(): IPostEvent {
    return instanceToPlain(this, {
      enableCircularCheck: true,
    }) as IPostEvent;
  }

  toDTO(): PostEventDto {
    const dto: PostEventDto = {
      ...this.toObject(),
      account: this.account?.toDTO(),
    };
    return dto;
  }
}
