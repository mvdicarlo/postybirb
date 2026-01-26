/* eslint-disable lingui/no-unlocalized-strings */
import { AccountId } from '@postybirb/types';
import {
  HttpClient,
  REMOTE_HOST_KEY,
  REMOTE_PASSWORD_KEY,
} from '../transports/http-client';

class RemoteApi {
  private readonly client: HttpClient = new HttpClient('remote');

  /**
   * Test ping against a remote host to validate connection
   */
  async testPing() {
    const host = localStorage.getItem(REMOTE_HOST_KEY);
    if (!host) {
      return Promise.reject(new Error('Remote host is not configured'));
    }

    const remotePassword = localStorage.getItem(REMOTE_PASSWORD_KEY);
    if (!remotePassword) {
      return Promise.reject(new Error('Remote password is not configured'));
    }

    let res;
    try {
      const url = `https://${host}/api/remote/ping/${encodeURIComponent(remotePassword)}`;
      res = await fetch(url);
    } catch (e) {
      // eslint-disable-next-line @typescript-eslint/no-throw-literal
      throw {
        error: `Server unreachable`,
        statusCode: e,
        message: 'Ensure the IP is correct',
      };
    }

    const response = await res.json();
    if (!res.ok) {
      return Promise.reject(response);
    }
    return response;
  }

  async setCookies(accountId: AccountId) {
    return this.client.post(`set-cookies`, {
      accountId,
      cookies: await window.electron?.getCookiesForAccount(accountId),
    });
  }
}

export default new RemoteApi();
