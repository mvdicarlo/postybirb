import {
  IPostRecordMetadata,
  IWebsiteError,
  IWebsitePostRecord,
  PostData,
  WebsitePostRecordDto
} from '@postybirb/types';
import { instanceToPlain, Type } from 'class-transformer';
import { Account } from './account.entity';
import { DatabaseEntity } from './database-entity';
import { PostRecord } from './post-record.entity';

export class WebsitePostRecord
  extends DatabaseEntity
  implements IWebsitePostRecord
{
  postRecordId: string;

  accountId: string;

  @Type(() => PostRecord)
  parent: PostRecord;

  metadata: IPostRecordMetadata = {
    sourceMap: {},
    postedFiles: [],
    nextBatchNumber: 1,
  };

  completedAt: string;

  @Type(() => Account)
  account: Account;

  errors: IWebsiteError[] = [];

  postData: PostData;

  toObject(): IWebsitePostRecord {
    return instanceToPlain(this, {
      enableCircularCheck: true,
    }) as IWebsitePostRecord;
  }

  toDTO(): WebsitePostRecordDto {
    return this.toObject() as unknown as WebsitePostRecordDto;
  }
}
