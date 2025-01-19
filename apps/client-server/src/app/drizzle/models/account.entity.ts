import { IAccount, IAccountDto } from '@postybirb/types';
import {
    Exclude,
    instanceToPlain,
    plainToClass,
    Type,
} from 'class-transformer';
import { account } from '../schemas';
import { DatabaseEntity } from './database-entity';
import { WebsiteData } from './website-data.entity';

export class Account extends DatabaseEntity implements IAccount {
  name: string;

  website: string;

  @Exclude()
  groups: string[];

  @Type(() => WebsiteData)
  websiteData: WebsiteData;

  toObject(): IAccount {
    return instanceToPlain(this, {
      enableCircularCheck: true,
    }) as IAccount;
  }

  toDTO(): IAccountDto {
    return this.toObject() as unknown as IAccountDto;
  }

  toJson(): string {
    return JSON.stringify(this.toObject());
  }

  static fromDBO(entity: typeof account.$inferSelect): Account {
    return plainToClass(Account, entity, {
      enableCircularCheck: true,
    });
  }
}
