import { IWebsiteLoginInfo } from '@postybirb/dto';
import Https from '../transports/https';

export default class WebsitesApi {
  private static readonly request: Https = new Https('websites');

  static getLoginInfo() {
    return WebsitesApi.request.get<IWebsiteLoginInfo[]>('login-info');
  }
}
