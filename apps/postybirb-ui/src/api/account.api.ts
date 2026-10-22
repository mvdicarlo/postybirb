import {
  AccountId,
  DynamicObject,
  IAccountDto,
  CreateAccountDto,
  SetWebsiteDataRequestDto,
  UpdateAccountDto,
} from '@postybirb/types';
import { BaseApi } from './base.api';

class AccountApi extends BaseApi<
  IAccountDto,
  CreateAccountDto,
  UpdateAccountDto
> {
  constructor() {
    super('account');
  }

  async clear(id: AccountId) {
    return this.client.post<undefined>(`clear/${id}`);
  }

  setWebsiteData<T extends DynamicObject>(
    request: SetWebsiteDataRequestDto<T>,
  ) {
    return this.client.post<undefined>('account-data', request);
  }

  async refreshLogin(id: AccountId) {
    return this.client.get<undefined>(`refresh/${id}`);
  }
}

export default new AccountApi();
