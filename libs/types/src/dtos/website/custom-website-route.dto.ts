import { WebsiteId } from '../../models';

export interface ICustomWebsiteRouteDto {
  id: WebsiteId;
  route: string;
  data: unknown;
}
