import {
  IWebsiteFormFields,
  IWebsiteOptions,
  WebsiteOptionsDto,
} from '@postybirb/types';
import { instanceToPlain, plainToClass, Type } from 'class-transformer';
import { BaseWebsiteOptions } from '../../websites/models/base-website-options';
import { websiteOptions } from '../schemas';
import { Account } from './account.entity';
import { DatabaseEntity } from './database-entity';
import { Submission } from './submission.entity';

export class WebsiteOptions extends DatabaseEntity implements IWebsiteOptions {
  @Type(() => Submission)
  submission: Submission;

  data: IWebsiteFormFields = new BaseWebsiteOptions();

  @Type(() => Account)
  account: Account;

  isDefault = false;

  toObject(): IWebsiteOptions {
    return instanceToPlain(this, {
      enableCircularCheck: true,
    }) as IWebsiteOptions;
  }

  toDTO(): WebsiteOptionsDto {
    return this.toObject() as unknown as WebsiteOptionsDto;
  }

  toJson(): string {
    return JSON.stringify(this.toObject());
  }

  static fromDBO(entity: typeof websiteOptions.$inferSelect): WebsiteOptions {
    return plainToClass(WebsiteOptions, entity, {
      enableCircularCheck: true,
    });
  }
}
