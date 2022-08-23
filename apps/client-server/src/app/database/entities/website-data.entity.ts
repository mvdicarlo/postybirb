import { Entity, Property } from '@mikro-orm/core';
import { SafeObject } from '../../shared/types/safe-object';
import { IWebsiteData } from '../../websites/models/website-data';
import { BaseEntity } from './base.entity';

@Entity()
export class WebsiteData<T extends SafeObject>
  extends BaseEntity<WebsiteData<T>, 'id'>
  implements IWebsiteData<T>
{
  @Property({ type: 'json' })
  data: T;
}
