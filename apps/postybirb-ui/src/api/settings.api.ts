import type {
  EntityId,
  IUpdateSettingsDto,
  SettingsDto,
} from '@postybirb/types';
import type {
  ProxyConfiguration,
  ProxyPoolEntry,
} from '@postybirb/utils/common/proxy-settings';
import {
  getLocalBaseUrl,
  getLocalServerPassword,
  HttpClient,
} from '../transports/http-client';

type StartupOptions = {
  startAppOnSystemStartup?: boolean;
  spellchecker?: boolean;
  appDataPath?: string;
  port?: string;
  proxy?: Partial<ProxyConfiguration> | unknown;
};

class SettingsApi {
  private readonly client: HttpClient = new HttpClient('settings');

  /** Local Electron Nest — used for client-scope proxy when connected to a remote host. */
  private readonly localClient: HttpClient = new HttpClient(
    'settings',
    getLocalBaseUrl,
    getLocalServerPassword,
  );

  getAll() {
    return this.client.get<SettingsDto[]>();
  }

  /** Startup options for the active API target (remote host when in remote client mode). */
  getStartupOptions() {
    return this.client.get<StartupOptions>('startup');
  }

  getLocalStartupOptions() {
    return this.localClient.get<StartupOptions>('startup');
  }

  update(id: EntityId, dto: IUpdateSettingsDto) {
    return this.client.patch(id, dto);
  }

  updateSystemStartupSettings(startUpOptions: Partial<StartupOptions>) {
    return this.client.patch(`startup/system-startup`, startUpOptions);
  }

  updateLocalSystemStartupSettings(startUpOptions: Partial<StartupOptions>) {
    return this.localClient.patch(`startup/system-startup`, startUpOptions);
  }

  testProxyConnection(poolEntry: ProxyPoolEntry) {
    return this.client.post<{ success: boolean; message: string }>(
      'startup/proxy/test',
      poolEntry,
    );
  }

  testLocalProxyConnection(poolEntry: ProxyPoolEntry) {
    return this.localClient.post<{ success: boolean; message: string }>(
      'startup/proxy/test',
      poolEntry,
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
