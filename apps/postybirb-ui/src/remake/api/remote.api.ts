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
    const host = localStorage.getItem(REMOTE_PASSWORD_KEY);
    if (!host) {
      // eslint-disable-next-line lingui/no-unlocalized-strings
      return Promise.reject(new Error('Remote host is not configured'));
    }
    const remotePassword = localStorage.getItem(REMOTE_HOST_KEY);
    if (!remotePassword) {
      // eslint-disable-next-line lingui/no-unlocalized-strings
      return Promise.reject(new Error('Remote password is not configured'));
    }
    const res = await fetch(
      `https://${host}/api/remote/ping/${encodeURIComponent(remotePassword)}`,
    );
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
