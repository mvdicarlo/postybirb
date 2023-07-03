import { ISettingsDto, IUpdateSettingsDto } from '@postybirb/dto';
import { EntityId } from '@postybirb/types';
import Https from '../transports/https';

class SettingsApi {
  private readonly client: Https = new Https('settings');

  getAll() {
    return this.client.get<ISettingsDto[]>();
  }

  update(id: EntityId, dto: IUpdateSettingsDto) {
    return this.client.patch(id, dto);
  }
}

export default new SettingsApi();
