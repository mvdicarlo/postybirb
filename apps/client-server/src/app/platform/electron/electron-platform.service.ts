import { Injectable } from '@nestjs/common';
import { PlatformService } from '@postybirb/platform';
import { SettingsConstants } from '@postybirb/types';
import { SettingsService } from '../../settings/settings.service';
import { ElectronAppService } from './electron-app.service';
import { ElectronBrowserService } from './electron-browser.service';
import { ElectronHttpService } from './electron-http.service';
import { ElectronNetworkService } from './electron-network.service';
import { ElectronNotificationService } from './electron-notification.service';
import { ElectronProcessService } from './electron-process.service';
import { ElectronSessionService } from './electron-session.service';

/**
 * Aggregates the Electron-backed platform capability implementations into
 * the single {@link PlatformService} facade exposed via Nest DI.
 */
@Injectable()
export class ElectronPlatformService extends PlatformService {
  constructor(settingsService: SettingsService) {
    super();
    this.http = new ElectronHttpService(async () => {
      const settings = await settingsService.getDefaultSettings();
      return (
        settings?.settings.cloudflareChallenge?.openBrowserWindow ??
        SettingsConstants.DEFAULT_SETTINGS.cloudflareChallenge
          ?.openBrowserWindow ??
        false
      );
    });
  }

  readonly app = new ElectronAppService();

  readonly session = new ElectronSessionService();

  readonly browser = new ElectronBrowserService();

  readonly notification = new ElectronNotificationService();

  readonly network = new ElectronNetworkService();

  readonly http: ElectronHttpService;

  readonly process = new ElectronProcessService();
}
