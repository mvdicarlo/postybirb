import { IWebsiteInfoDto } from '@postybirb/dto';
import Https from '../transports/https';

export default class WebsitesApi {
  private static readonly request: Https = new Https('websites');

  static getWebsiteInfo() {
    return WebsitesApi.request
      .get<IWebsiteInfoDto[]>('info')
      .then((res) => res.body);
  }
}
