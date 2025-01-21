import { IWebsiteData, IWebsiteDataDto } from '@postybirb/types';
import { instanceToPlain, Type } from 'class-transformer';
import { Account } from './account.entity';
import { DatabaseEntity } from './database-entity';

export class WebsiteData extends DatabaseEntity implements IWebsiteData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any = {};

  @Type(() => Account)
  account: Account;

  toObject(): IWebsiteData {
    return instanceToPlain(this) as IWebsiteData;
  }

  toDTO(): IWebsiteDataDto {
    return this.toObject() as unknown as IWebsiteDataDto;
  }
}
