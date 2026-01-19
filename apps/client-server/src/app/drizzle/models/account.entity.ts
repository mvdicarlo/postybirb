import { IAccount, IAccountDto } from '@postybirb/types';
import { Exclude, instanceToPlain, Type } from 'class-transformer';
import type { UnknownWebsite } from '../../websites/website';
import { DatabaseEntity } from './database-entity';
import { WebsiteData } from './website-data.entity';

export class Account extends DatabaseEntity implements IAccount {
  name: string;

  website: string;

  groups: string[] = [];

  /**
   * we don't want to pass this down to users unless filtered
   * by the website instance.
   */
  @Exclude()
  @Type(() => WebsiteData)
  websiteData: WebsiteData;

  @Exclude()
  websiteInstance?: UnknownWebsite;

  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(entity: Partial<IAccount>) {
    super(entity);
    Object.assign(this, entity);
  }

  toObject(): IAccount {
    return instanceToPlain(this, {
      enableCircularCheck: true,
    }) as IAccount;
  }

  toDTO(): IAccountDto {
    const dto: IAccountDto = {
      ...(this.toObject() as unknown as IAccountDto),
      data: this.websiteInstance?.getWebsiteData() ?? {},
      state: this.websiteInstance?.getLoginState() ?? {
        isLoggedIn: false,
        username: '',
        pending: false,
      },
      websiteInfo: {
        websiteDisplayName:
          this.websiteInstance?.decoratedProps.metadata.displayName ?? '',
        supports: this.websiteInstance?.getSupportedTypes() ?? [],
      },
    };
    return dto;
  }

  withWebsiteInstance(websiteInstance: UnknownWebsite): this {
    this.websiteInstance = websiteInstance;
    return this;
  }
}
