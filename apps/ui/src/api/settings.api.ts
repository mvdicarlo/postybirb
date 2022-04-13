import { ISettingsDto, IUpdateSettingsDto } from '@postybirb/dto';
import Https from '../transports/https';

export default class SettingsApi {
  private static readonly request: Https = new Https('settings');

  static getAll() {
    return SettingsApi.request.get<ISettingsDto[]>();
  }

  static update(dto: IUpdateSettingsDto) {
    return SettingsApi.request.patch('/', dto);
  }
}
