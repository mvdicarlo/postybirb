import {
  Entity,
  EntityRepositoryType,
  JsonType,
  Property,
  serialize,
} from '@mikro-orm/core';
import { IWebsiteData, IWebsiteDataDto, SafeObject } from '@postybirb/types';
import { PostyBirbRepository } from '../repositories/postybirb-repository';
import { PostyBirbEntity } from './postybirb-entity';

/** @inheritdoc */
@Entity({ customRepository: () => PostyBirbRepository })
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class WebsiteData<T extends SafeObject = any>
  extends PostyBirbEntity
  implements IWebsiteData
{
  [EntityRepositoryType]?: PostyBirbRepository<WebsiteData>;

  @Property({ type: JsonType })
  data: T = {} as T;

  toJSON(): IWebsiteDataDto<T> {
    return serialize(this) as IWebsiteDataDto<T>;
  }
}
