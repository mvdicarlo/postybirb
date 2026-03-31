import {
  AccountId,
  IAccountDto,
  ICreateAccountDto,
  ISetWebsiteDataRequestDto,
  IUpdateAccountDto,
} from '@postybirb/types';
import { getRemoteConfig } from '../transports/http-client';
import { BaseApi } from './base.api';
import remoteApi from './remote.api';

class AccountApi extends BaseApi<
  IAccountDto,
  ICreateAccountDto,
  IUpdateAccountDto
> {
  constructor() {
    super('account');
  }

  private async updateRemoteCookies(accountId: AccountId) {
    const remoteConfig = getRemoteConfig();
    if (
      remoteConfig.mode === 'client' &&
      remoteConfig.host &&
      remoteConfig.password
    ) {
      return remoteApi.setCookies(accountId);
    }
    return Promise.resolve();
  }

  async clear(id: AccountId) {
    await this.updateRemoteCookies(id);
    return this.client.post<undefined>(`clear/${id}`);
  }

  setWebsiteData<T>(request: ISetWebsiteDataRequestDto<T>) {
    return this.client.post<undefined>('account-data', request);
  }

  async refreshLogin(id: AccountId) {
    await this.updateRemoteCookies(id);
    return this.client.get<undefined>(`refresh/${id}`);
  }
}

export default new AccountApi();
