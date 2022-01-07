import { IAccountDto, IUpdateAccountDto } from '@postybirb/dto';
import Https from '../transports/https';

export default class AccountApi {
  private static readonly request: Https = new Https('account');

  static delete(id: string) {
    return AccountApi.request.delete(id);
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

  static updateName(id: string, update: IUpdateAccountDto) {
    return AccountApi.request.patch(id, update);
  }
}
