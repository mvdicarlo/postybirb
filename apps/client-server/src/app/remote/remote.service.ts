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
      await this.platform.session.clearStorageData(updateCookies.accountId);
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
    } else {
      await this.platform.browser.runScriptOnPage(
        updateCookies.accountId,
        updateCookies.localStorage.url,
        `for (const [key, value] of Object.entries(JSON.parse(${JSON.stringify(JSON.stringify(updateCookies.localStorage.data))}))) {
            localStorage.setItem(key, value)
         }`,
      );
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
