import {
  AccountId,
  CustomRoutes,
  IAccountDto,
  ICreateAccountDto,
  ICustomWebsiteRouteDto,
  ISetWebsiteDataRequestDto,
  IUpdateAccountDto,
  WebsiteId,
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

  clear(id: AccountId) {
    return this.client.post<undefined>(`clear/${id}`);
  }

  setWebsiteData<T>(request: ISetWebsiteDataRequestDto<T>) {
    return this.client.post<undefined>('account-data', request);
  }

  customRoute<
    Routes extends CustomRoutes,
    Route extends keyof Routes = keyof Routes,
  >(id: WebsiteId, route: Route, data: Routes[Route]['request']) {
    return this.client
      .post(`custom-route`, {
        id,
        route: route as string,
        data,
      } satisfies ICustomWebsiteRouteDto)
      .then((response) => response.body as Routes[Route]['response']);
  }

  refreshLogin(id: AccountId) {
    return this.client.get<undefined>(`refresh/${id}`);
  }
}

export default new AccountApi();
