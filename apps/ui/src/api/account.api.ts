import {
  IAccountDto,
  ICreateAccountDto,
  ISetWebsiteDataRequestDto,
  IUpdateAccountDto,
} from '@postybirb/dto';
import {
  ActionEntityType,
  ActionHistory,
  ActionType,
} from '../modules/action-history/action-history';
import Https from '../transports/https';

export default class AccountApi {
  private static readonly request: Https = new Https('account');

  static create(createAccountDto: ICreateAccountDto) {
    return AccountApi.request.post('', createAccountDto);
  }

  static remove(ids: string[], action: 'UNDO' | 'REDO' | 'DELETE') {
    if (action === 'DELETE') {
      ActionHistory.RecordAction({
        entity: ActionEntityType.ACCOUNT,
        type: ActionType.DELETE,
        ids,
      });
    }
    return AccountApi.request.delete('', { ids, action });
  }

  static getAll() {
    return AccountApi.request.get<IAccountDto[]>();
  }

  static get(id: string, refresh = false) {
    return AccountApi.request.get<IAccountDto>(id, { refresh });
  }

  static clear(id: string) {
    return AccountApi.request.post(`clear/${id}`);
  }

  static setWebsiteData<T>(request: ISetWebsiteDataRequestDto<T>) {
    return AccountApi.request.post('account-data', request);
  }

  static update(update: IUpdateAccountDto) {
    return AccountApi.request.patch('', update);
  }

  static refreshLogin(id: string) {
    return AccountApi.request.get(`refresh/${id}`);
  }
}
