import {
  EntityPrimitive,
  IPostRecord,
  IPostRecordMetadata,
  IWebsiteError,
  IWebsitePostRecord,
  PostData,
  WebsitePostRecordDto,
} from '@postybirb/types';
import { instanceToPlain, Transform, Type } from 'class-transformer';
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

  toObject(): EntityPrimitive<IWebsitePostRecord> {
    return instanceToPlain(this, {
      enableCircularCheck: true,
    }) as EntityPrimitive<IWebsitePostRecord>;
  }

  toDTO(): WebsitePostRecordDto {
    return this.toObject() as unknown as WebsitePostRecordDto;
  }
}
