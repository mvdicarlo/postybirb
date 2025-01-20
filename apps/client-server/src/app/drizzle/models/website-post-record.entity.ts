import {
  IPostRecord,
  IPostRecordMetadata,
  IWebsiteError,
  IWebsitePostRecord,
  PostData,
  WebsitePostRecordDto,
} from '@postybirb/types';
import {
  instanceToPlain,
  plainToClass,
  Transform,
  Type,
} from 'class-transformer';
import { websitePostRecord } from '../schemas';
import { Account } from './account.entity';
import { DatabaseEntity } from './database-entity';

export class WebsitePostRecord
  extends DatabaseEntity
  implements IWebsitePostRecord
{
  parent: IPostRecord;

  metadata: IPostRecordMetadata = {
    sourceMap: {},
    postedFiles: [],
    nextBatchNumber: 1,
  };

  @Transform(({ value }) => (value ? new Date(value) : undefined), {
    toClassOnly: true,
  })
  @Transform(({ value }) => value?.toISOString(), {
    toPlainOnly: true,
  })
  completedAt?: Date;

  @Type(() => Account)
  account: Account;

  errors?: IWebsiteError[];

  postData?: PostData;

  toObject(): IWebsitePostRecord {
    return instanceToPlain(this, {
      enableCircularCheck: true,
    }) as IWebsitePostRecord;
  }

  toDTO(): WebsitePostRecordDto {
    return this.toObject() as unknown as WebsitePostRecordDto;
  }

  static fromDBO(
    entity: typeof websitePostRecord.$inferSelect,
  ): WebsitePostRecord {
    return plainToClass(WebsitePostRecord, entity, {
      enableCircularCheck: true,
    });
  }
}
