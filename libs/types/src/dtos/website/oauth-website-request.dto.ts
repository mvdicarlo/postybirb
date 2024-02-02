import { DynamicObject } from '../../models';

export interface IOAuthWebsiteRequestDto<T extends DynamicObject> {
  id: string;
  website: string;
  data: T;
  state: string;
}
