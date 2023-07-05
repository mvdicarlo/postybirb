import { EntityId, IUpdateSettingsDto, SettingsDto } from '@postybirb/types';
import Https from '../transports/https';

class SettingsApi {
  private readonly client: Https = new Https('settings');

  getAll() {
    return this.client.get<SettingsDto[]>();
  }

  update(id: EntityId, dto: IUpdateSettingsDto) {
    return this.client.patch(id, dto);
  }
}

export default new SettingsApi();
