import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Logger } from '@postybirb/logger';
import { SettingsService } from '../settings/settings.service';

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
}
