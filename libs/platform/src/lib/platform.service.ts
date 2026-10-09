import { PlatformAppService } from './platform-app.service';
import { PlatformBrowserService } from './platform-browser.service';
import { PlatformHttpService } from './platform-http.service';
import { PlatformNetworkService } from './platform-network.service';
import { PlatformNotificationService } from './platform-notification.service';
import { PlatformProcessService } from './platform-process.service';
import { PlatformSessionService } from './platform-session.service';

/**
 * Single facade for all platform-dependent capabilities.
 *
 * Consumers inject one `PlatformService` and access individual capability
 * groups via the readonly sub-properties (e.g. `platform.app.getVersion()`,
 * `platform.session.getCookies(...)`).
 *
 * This avoids threading multiple platform tokens through constructors and
 * eliminates the need for a separate "context" bundle object.
 */
export abstract class PlatformService {
  abstract readonly app: PlatformAppService;
  abstract readonly session: PlatformSessionService;
  abstract readonly browser: PlatformBrowserService;
  abstract readonly notification: PlatformNotificationService;
  abstract readonly network: PlatformNetworkService;
  abstract readonly http: PlatformHttpService;
  abstract readonly process: PlatformProcessService;
}
