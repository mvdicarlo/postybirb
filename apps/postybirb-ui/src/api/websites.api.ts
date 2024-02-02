import { IOAuthWebsiteRequestDto, IWebsiteInfoDto } from '@postybirb/types';
import { HttpClient } from '../transports/http-client';

class WebsitesApi {
  private readonly client: HttpClient = new HttpClient('websites');

  getWebsiteInfo() {
    return this.client.get<IWebsiteInfoDto[]>('info');
  }

  performOAuthStep(dto: IOAuthWebsiteRequestDto<never>) {
    return this.client.post('oauth', dto);
  }
}

export default new WebsitesApi();
