import { EntityId, IUpdateSettingsDto, SettingsDto } from '@postybirb/types';
import { HttpClient } from '../transports/http-client';

class SettingsApi {
  private readonly client: HttpClient = new HttpClient('settings');

  getAll() {
    return this.client.get<SettingsDto[]>();
  }

  update(id: EntityId, dto: IUpdateSettingsDto) {
    return this.client.patch(id, dto);
  }
}

export default new SettingsApi();
