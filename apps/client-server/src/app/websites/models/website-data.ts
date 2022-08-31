import { SafeObject } from '../../shared/types/safe-object';

export interface IWebsiteData<T extends SafeObject> {
  id: string;
  data: T;
}
