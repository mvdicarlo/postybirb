import { IBaseEntity } from '../../database/models/base-entity';
import { SafeObject } from '../../shared/types/safe-object';

export interface IWebsiteData<T extends SafeObject> extends IBaseEntity {
  id: string;
  data: T;
}
