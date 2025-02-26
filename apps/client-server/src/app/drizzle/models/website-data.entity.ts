import {
  DynamicObject,
  IWebsiteData,
  IWebsiteDataDto
} from '@postybirb/types';
import { instanceToPlain, Type } from 'class-transformer';
import { Account } from './account.entity';
import { DatabaseEntity } from './database-entity';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class WebsiteData<T extends DynamicObject = any>
  extends DatabaseEntity
  implements IWebsiteData<T>
{
  data: T = {} as T;

  @Type(() => Account)
  account: Account;

  toObject(): IWebsiteData {
    return instanceToPlain(this) as IWebsiteData;
  }

  toDTO(): IWebsiteDataDto {
    return this.toObject() as unknown as IWebsiteDataDto;
  }
}
