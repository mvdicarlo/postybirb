import { Entity, Property } from '@mikro-orm/core';
import { IWebsiteData, SafeObject } from '@postybirb/types';
import { BaseEntity } from './base.entity';

@Entity()
export class WebsiteData<T extends SafeObject>
  extends BaseEntity<WebsiteData<T>>
  implements IWebsiteData<T>
{
  @Property({ type: 'json' })
  data: T;
}
