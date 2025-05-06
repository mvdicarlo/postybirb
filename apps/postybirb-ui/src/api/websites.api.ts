import {
  IOAuthWebsiteRequestDto,
  IWebsiteInfoDto,
  OAuthRoutes,
  WebsiteId,
} from '@postybirb/types';
import { HttpClient } from '../transports/http-client';

class WebsitesApi {
  private readonly client: HttpClient = new HttpClient('websites');

  getWebsiteInfo() {
    return this.client.get<IWebsiteInfoDto[]>('info');
  }

  async performOAuthStep<
    T extends OAuthRoutes,
    Route extends keyof T = keyof T,
  >(id: WebsiteId, route: Route, data: T[Route]['request']) {
    const response = await this.client.post(`oauth`, {
      route: route as string,
      id,
      data,
    } satisfies IOAuthWebsiteRequestDto<T[Route]['request']>);

    return response.body as T[Route]['response'];
  }
}

export default new WebsitesApi();
