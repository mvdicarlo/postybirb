import { Injectable } from '@nestjs/common';
import { PlatformService } from '@postybirb/platform';
import { ElectronAppService } from './electron-app.service';
import { ElectronBrowserService } from './electron-browser.service';
import { ElectronHttpService } from './electron-http.service';
import { ElectronNetworkService } from './electron-network.service';
import { ElectronNotificationService } from './electron-notification.service';
import { ElectronSessionService } from './electron-session.service';

/**
 * Aggregates the Electron-backed platform capability implementations into
 * the single {@link PlatformService} facade exposed via Nest DI.
 */
@Injectable()
export class ElectronPlatformService extends PlatformService {
  readonly app = new ElectronAppService();

  readonly session = new ElectronSessionService();

  readonly browser = new ElectronBrowserService();

  readonly notification = new ElectronNotificationService();

  readonly network = new ElectronNetworkService();

  readonly http = new ElectronHttpService();
}
