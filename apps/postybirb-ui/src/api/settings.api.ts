import type {
  EntityId,
  UpdateSettingsDto,
  UpdateStartupSettingsDto,
  SettingsDto,
} from '@postybirb/types';
import type { StartupOptions } from '@postybirb/utils/common';
import { HttpClient } from '../transports/http-client';

class SettingsApi {
  // Settings should only ever update local settings
  private readonly client: HttpClient = new HttpClient('settings');

  getAll() {
    return this.client.get<SettingsDto[]>();
  }

  getStartupOptions() {
    return this.client.get<StartupOptions>('startup');
  }

  update(id: EntityId, dto: UpdateSettingsDto) {
    return this.client.patch(id, dto);
  }

  updateSystemStartupSettings(
    startAppOnSystemStartup: UpdateStartupSettingsDto,
  ) {
    return this.client.patch<StartupOptions>(
      `startup/system-startup`,
      startAppOnSystemStartup,
    );
  }
}

export default new SettingsApi();
