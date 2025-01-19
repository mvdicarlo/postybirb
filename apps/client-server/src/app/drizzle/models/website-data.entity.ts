import { IWebsiteData, IWebsiteDataDto } from '@postybirb/types';
import { instanceToPlain, plainToClass, Transform } from 'class-transformer';
import { websiteData } from '../schemas';
import { Account } from './account.entity';
import { DatabaseEntity } from './database-entity';

export class WebsiteData extends DatabaseEntity implements IWebsiteData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any = {};

  @Transform(({ value }) => Account.fromDBO(value))
  account: Account;

  toObject(): IWebsiteData {
    return instanceToPlain(this) as IWebsiteData;
  }

  toDTO(): IWebsiteDataDto {
    return this.toObject() as unknown as IWebsiteDataDto;
  }

  static fromDBO(entity: typeof websiteData.$inferSelect): WebsiteData {
    return plainToClass(WebsiteData, entity);
  }
}
