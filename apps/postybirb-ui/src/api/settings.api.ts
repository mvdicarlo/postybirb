import type {
  EntityId,
  IUpdateSettingsDto,
  SettingsDto,
} from '@postybirb/types';
import type { ProxyProfile, StartupOptions } from '@postybirb/utils/common';
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

  update(id: EntityId, dto: IUpdateSettingsDto) {
    return this.client.patch(id, dto);
  }

  updateSystemStartupSettings(
    startAppOnSystemStartup: Partial<StartupOptions>,
  ) {
    return this.client.patch(`startup/system-startup`, startAppOnSystemStartup);
  }

  testProxyConnection(
    proxy: ProxyProfile & { websiteId?: string },
  ) {
    return this.client.post<{ success: boolean; message: string }>(
      'startup/proxy/test',
      proxy,
    );
  }

  testRemoteConnection(hostUrl: string, password: string) {
    return this.client.post<{ success: boolean; message: string }>(
      'startup/remote/test',
      { hostUrl, password },
    );
  }
}

export default new SettingsApi();
