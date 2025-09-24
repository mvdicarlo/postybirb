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

  async performOAuthStep<T extends OAuthRoutes, R extends keyof T = keyof T>(
    id: WebsiteId,
    route: R,
    data: T[R]['request'],
  ): Promise<T[R]['response']> {
    const response = await this.client.post(`oauth`, {
      route: route as string,
      id,
      data,
    } satisfies IOAuthWebsiteRequestDto<T[R]['request']>);

    return response.body as T[R]['response'];
  }
}

export default new WebsitesApi();
