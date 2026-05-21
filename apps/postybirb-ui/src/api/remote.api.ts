/* eslint-disable lingui/no-unlocalized-strings */
import { AccountId } from '@postybirb/types';
import { HttpClient } from '../transports/http-client';

class RemoteApi {
  private readonly client: HttpClient = new HttpClient('remote');

  async setCookies(accountId: AccountId) {
    return this.client.post(`set-cookies`, {
      accountId,
      cookies: await window.electron?.getCookiesForAccount(accountId),
    });
  }
}

export default new RemoteApi();
