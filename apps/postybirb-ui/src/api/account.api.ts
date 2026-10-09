import {
  AccountId,
  IAccountDto,
  ICreateAccountDto,
  ISetWebsiteDataRequestDto,
  IUpdateAccountDto,
} from '@postybirb/types';
import { BaseApi } from './base.api';

class AccountApi extends BaseApi<
  IAccountDto,
  ICreateAccountDto,
  IUpdateAccountDto
> {
  constructor() {
    super('account');
  }

  async clear(id: AccountId) {
    return this.client.post<undefined>(`clear/${id}`);
  }

  setWebsiteData<T>(request: ISetWebsiteDataRequestDto<T>) {
    return this.client.post<undefined>('account-data', request);
  }

  async refreshLogin(id: AccountId) {
    return this.client.get<undefined>(`refresh/${id}`);
  }
}

export default new AccountApi();
