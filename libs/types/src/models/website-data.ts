import { IBaseEntity } from './base-entity';
import { SafeObject } from './safe-object';

export interface IWebsiteData<T extends SafeObject> extends IBaseEntity {
  id: string;
  data: T;
}
