import { DynamicObject } from '../../models';

export interface IOAuthWebsiteRequestDto<T extends DynamicObject> {
  id: string;
  data: T;
  route: string;
}
