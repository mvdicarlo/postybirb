import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Logger } from '@postybirb/logger';
import {
  PlatformCookie,
  PlatformCookieDetails,
  PlatformService,
} from '@postybirb/platform';
import { RemoteConfigManager } from '@postybirb/utils/common';
import { UpdateCookiesRemoteDto } from './models/update-cookies-remote.dto';

@Injectable()
export class RemoteService {
  protected readonly logger = Logger(this.constructor.name);

  /**
   * Last `localStorage` payload written per account, keyed by account id and
   * stored as a JSON signature of `{ url, data }`.
   *
   * Writing localStorage requires spawning a headless BrowserWindow and
   * loading the target page — an expensive operation that, when triggered on
   * every login-check event (as the Itaku login flow does), can hang the
   * server on resource-constrained hosts. We cache the last value we wrote
   * and skip the write when the incoming payload is identical.
   */
  private readonly localStorageCache = new Map<string, string>();

  constructor(private readonly platform: PlatformService) {}

  async validate(password: string): Promise<boolean> {
    const remoteConfig = await RemoteConfigManager.get();
    // if (!remoteConfig.enabled) {
    //   this.logger.error('Remote access is not enabled');
    //   throw new UnauthorizedException('Remote access is not enabled');
    // }

    if (remoteConfig.password !== password) {
      this.logger.error('Invalid remote access password');
      throw new UnauthorizedException('Invalid remote access password');
    }

    return true;
  }

  /**
   * Set cookies for the specified account ID.
   * To share cookies with the remote host, this method should be called.
   *
   * @param {UpdateCookiesRemoteDto} updateCookies
   */
  async setCookies(updateCookies: UpdateCookiesRemoteDto) {
    this.logger
      .withMetadata({ accountId: updateCookies.accountId })
      .info('Updating cookies and local storage from remote client');

    const clientCookies = Buffer.from(updateCookies.cookies, 'base64').toString(
      'utf-8',
    );
    const cookies = JSON.parse(clientCookies);

    if (!Array.isArray(cookies)) {
      this.logger.error('Invalid cookies format received from remote client');
      throw new Error('Invalid cookies format received from remote client');
    }
    if (cookies.length === 0) {
      this.logger.warn('No cookies provided for account, skipping update');
    } else {
      // Clear only cookies (not localStorage) so the cached localStorage we
      // persist below survives cookie refreshes and we can safely skip
      // rewriting it when it hasn't changed.
      await this.platform.session.clearStorageData(updateCookies.accountId, {
        storages: ['cookies'],
      });
      await Promise.all(
        cookies.map((cookie) =>
          this.platform.session.setCookie(
            updateCookies.accountId,
            this.convertCookie(cookie),
          ),
        ),
      );
    }

    if (!updateCookies.localStorage) {
      this.logger.warn(
        'No local storage provided for account, skipping update',
      );
      this.localStorageCache.delete(updateCookies.accountId);
    } else {
      const signature = JSON.stringify({
        url: updateCookies.localStorage.url,
        data: updateCookies.localStorage.data,
      });

      if (this.localStorageCache.get(updateCookies.accountId) === signature) {
        this.logger
          .withMetadata({ accountId: updateCookies.accountId })
          .info('Local storage unchanged, skipping write');
      } else {
        await this.platform.browser.runScriptOnPage(
          updateCookies.accountId,
          updateCookies.localStorage.url,
          `for (const [key, value] of Object.entries(JSON.parse(${JSON.stringify(JSON.stringify(updateCookies.localStorage.data))}))) {
            localStorage.setItem(key, value)
         }`,
        );
        this.localStorageCache.set(updateCookies.accountId, signature);
      }
    }
  }

  private convertCookie(cookie: PlatformCookie): PlatformCookieDetails {
    const domain = cookie.domain ?? '';
    const url = `${cookie.secure ? 'https' : 'http'}://${domain}${cookie.path || ''}`;
    const details: PlatformCookieDetails = {
      domain: `.${domain}`.replace('..', '.'),
      httpOnly: cookie.httpOnly || false,
      name: cookie.name,
      secure: cookie.secure || false,
      url: url.replace('://.', '://'),
      value: cookie.value,
    };

    if (cookie.expirationDate) {
      details.expirationDate = cookie.expirationDate;
    }

    return details;
  }
}
