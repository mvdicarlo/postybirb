import { Entity, EntityRepositoryType, Property } from '@mikro-orm/core';
import { IWebsiteData, IWebsiteDataDto, SafeObject } from '@postybirb/types';
import { PostyBirbRepository } from '../repositories/postybirb-repository';
import { PostyBirbEntity } from './postybirb-entity';

/** @inheritdoc */
@Entity({ customRepository: () => PostyBirbRepository })
export class WebsiteData<T extends SafeObject>
  extends PostyBirbEntity
  implements IWebsiteData<T>
{
  [EntityRepositoryType]?: PostyBirbRepository<WebsiteData<T>>;

  @Property({ type: 'json' })
  data: T;

  toJson(): IWebsiteDataDto<T> {
    return {
      ...super.toJson(),
      data: { ...this.data },
    };
  }
}
