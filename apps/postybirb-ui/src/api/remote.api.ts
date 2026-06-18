/* eslint-disable lingui/no-unlocalized-strings */
import { AccountId, UpdateCookiesRemote } from '@postybirb/types';
import { getRemoteConfig, HttpClient } from '../transports/http-client';

class RemoteApi {
  private readonly client: HttpClient = new HttpClient('remote');

  async setCookiesAndLocalStorage(accountId: AccountId, currentUrl: string) {
    const remoteConfig = getRemoteConfig();
    if (
      remoteConfig.mode === 'client' &&
      remoteConfig.host &&
      remoteConfig.password
    ) {
      return this.client.post(`set-cookies`, {
        accountId,
        cookies: await window.electron?.getCookiesForAccount(accountId),
        localStorage: {
          url: currentUrl,
          data: await window.electron?.getLocalStorageForAccount(
            accountId,
            currentUrl,
          ),
        },
      } satisfies UpdateCookiesRemote);
    }

    return Promise.resolve();
  }
}

export default new RemoteApi();
