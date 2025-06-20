import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Logger } from '@postybirb/logger';
import { session } from 'electron';
import { SettingsService } from '../settings/settings.service';
import { UpdateCookiesRemoteDto } from './models/update-cookies-remote.dto';

@Injectable()
export class RemoteService {
  protected readonly logger = Logger(this.constructor.name);

  constructor(private readonly settingsService: SettingsService) {}

  async validate(password: string): Promise<boolean> {
    const remoteSettings = await this.getRemoteSettings();
    if (!remoteSettings.isEnabled) {
      this.logger.error('Remote access is not enabled');
      throw new UnauthorizedException('Remote access is not enabled');
    }

    if (!remoteSettings.isHost) {
      this.logger.error('Remote access is not set up for this host');
      throw new UnauthorizedException(
        'Remote access is not set up for this host',
      );
    }

    if (remoteSettings.password !== password) {
      this.logger.error('Invalid remote access password');
      throw new UnauthorizedException('Invalid remote access password');
    }

    if (remoteSettings.password !== password) {
      this.logger.error('Invalid remote access password');
      throw new UnauthorizedException('Invalid remote access password');
    }

    return true;
  }

  private async getRemoteSettings() {
    const settings = await this.settingsService.getDefaultSettings();
    if (!settings) {
      this.logger.error('Remote settings not found');
      throw new Error('Remote settings not found');
    }

    const { remoteSettings } = settings.settings;
    if (!remoteSettings) {
      throw new UnauthorizedException('Remote access is not set up');
    }

    return remoteSettings;
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
      .info('Updating cookies from remote client');

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
      return;
    }
    const accountSession = session.fromPartition(
      `persist:${updateCookies.accountId}`,
    );
    await accountSession.clearStorageData();
    await Promise.all(
      cookies.map((cookie) =>
        accountSession.cookies.set(this.convertCookie(cookie)),
      ),
    );
  }

  private convertCookie(cookie: Electron.Cookie): Electron.CookiesSetDetails {
    const url = `${cookie.secure ? 'https' : 'http'}://${cookie.domain}${cookie.path || ''}`;
    const details: Electron.CookiesSetDetails = {
      domain: `.${cookie.domain}`.replace('..', '.'),
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
