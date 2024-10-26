import { EntityId, IUpdateSettingsDto, SettingsDto } from '@postybirb/types';
import { StartupOptions } from '@postybirb/utils/electron';
import { HttpClient } from '../transports/http-client';

class SettingsApi {
  private readonly client: HttpClient = new HttpClient('settings');

  getAll() {
    return this.client.get<SettingsDto[]>();
  }

  getStartupOptions() {
    return this.client.get<StartupOptions>('startup');
  }

  update(id: EntityId, dto: IUpdateSettingsDto) {
    return this.client.patch(id, dto);
  }

  updateSystemStartupSettings(
    startAppOnSystemStartup: Partial<StartupOptions>,
  ) {
    return this.client.patch(`startup/system-startup`, startAppOnSystemStartup);
  }
}

export default new SettingsApi();
