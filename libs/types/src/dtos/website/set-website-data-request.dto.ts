import { WebsiteId } from '../../models';

export interface ISetWebsiteDataRequestDto<T> {
  id: WebsiteId;
  data: T;
}
