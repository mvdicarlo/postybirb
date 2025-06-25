import {
  BadRequestException,
  Injectable,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { SETTINGS_UPDATES } from '@postybirb/socket-events';
import { EntityId, SettingsConstants } from '@postybirb/types';
import {
  StartupOptions,
  getStartupOptions,
  setStartupOptions,
} from '@postybirb/utils/electron';
import { eq } from 'drizzle-orm';
import { PostyBirbService } from '../common/service/postybirb-service';
import { Settings } from '../drizzle/models';
import { WSGateway } from '../web-socket/web-socket-gateway';
import { UpdateSettingsDto } from './dtos/update-settings.dto';

@Injectable()
export class SettingsService
  extends PostyBirbService<'SettingsSchema'>
  implements OnModuleInit
{
  constructor(@Optional() webSocket: WSGateway) {
    super('SettingsSchema', webSocket);
    this.repository.subscribe('SettingsSchema', () => this.emit());
  }

  /**
   * Initializes default settings if required.
   * Also updates existing settings with any new default fields that might be missing.
   */
  async onModuleInit() {
    const defaultSettingsCount = await this.repository.count(
      eq(this.schema.profile, SettingsConstants.DEFAULT_PROFILE_NAME),
    );

    if (!defaultSettingsCount) {
      this.createDefaultSettings();
    } else {
      // Get existing default settings
      const existingSettings = await this.getDefaultSettings();
      if (existingSettings) {
        // Check if there are any missing fields compared to the current default settings
        const currentDefaults = SettingsConstants.DEFAULT_SETTINGS;
        let hasChanges = false;
        const updatedSettings = { ...existingSettings.settings };

        // Recursively merge missing fields
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mergeObjects = (target: any, source: any, path = ''): boolean => {
          let changed = false;

          Object.keys(source).forEach((key) => {
            const fullPath = path ? `${path}.${key}` : key;

            // If key doesn't exist in target, add it
            if (!(key in target)) {
              // eslint-disable-next-line no-param-reassign
              target[key] = source[key];
              this.logger.debug(`Added missing setting: ${fullPath}`);
              changed = true;
            }
            // If both are objects, recursively merge
            else if (
              typeof source[key] === 'object' &&
              source[key] !== null &&
              typeof target[key] === 'object' &&
              target[key] !== null &&
              !Array.isArray(source[key]) &&
              !Array.isArray(target[key])
            ) {
              const nestedChanged = mergeObjects(
                target[key],
                source[key],
                fullPath,
              );
              if (nestedChanged) changed = true;
            }
          });

          return changed;
        };

        hasChanges = mergeObjects(updatedSettings, currentDefaults);

        // Update database if there were changes
        if (hasChanges) {
          this.logger.debug('Updating default settings with missing fields');
          await this.repository.update(existingSettings.id, {
            settings: updatedSettings,
          });
        }
      }
    }
  }

  // Not sure if we'll ever need this
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  create(createDto: unknown): Promise<Settings> {
    throw new Error('Method not implemented.');
  }

  /**
   * Creates the default settings record.
   */
  private createDefaultSettings() {
    this.repository
      .insert({
        profile: SettingsConstants.DEFAULT_PROFILE_NAME,
        settings: SettingsConstants.DEFAULT_SETTINGS,
      })
      .then((entity) => {
        this.logger.withMetadata(entity).debug('Default settings created');
      })
      .catch((err: Error) => {
        this.logger.withError(err).error('Unable to create default settings');
      });
  }

  /**
   * Emits settings.
   */
  async emit() {
    super.emit({
      event: SETTINGS_UPDATES,
      data: (await this.findAll()).map((entity) => entity.toDTO()),
    });
  }

  /**
   * Gets the startup settings.
   */
  public getStartupSettings() {
    return getStartupOptions();
  }

  /**
   * Gets the default settings.
   */
  public getDefaultSettings() {
    return this.repository.findOne({
      where: (setting, { eq: equals }) =>
        equals(setting.profile, SettingsConstants.DEFAULT_PROFILE_NAME),
    });
  }

  /**
   * Updates app startup settings.
   */
  public updateStartupSettings(startUpOptions: Partial<StartupOptions>) {
    if (startUpOptions.appDataPath) {
      // eslint-disable-next-line no-param-reassign
      startUpOptions.appDataPath = startUpOptions.appDataPath.trim();
    }

    if (startUpOptions.port) {
      // eslint-disable-next-line no-param-reassign
      startUpOptions.port = startUpOptions.port.trim();
      const port = parseInt(startUpOptions.port, 10);
      if (Number.isNaN(port) || port < 1024 || port > 65535) {
        throw new BadRequestException('Invalid port');
      }
    }

    setStartupOptions({ ...startUpOptions });
  }

  /**
   * Updates settings.
   *
   * @param {string} id
   * @param {UpdateSettingsDto} updateSettingsDto
   * @return {*}
   */
  async update(id: EntityId, updateSettingsDto: UpdateSettingsDto) {
    this.logger
      .withMetadata(updateSettingsDto)
      .info(`Updating Settings '${id}'`);

    return this.repository.update(id, updateSettingsDto);
  }

  /**
   * Tests remote connection to a PostyBirb host.
   *
   * @param {string} hostUrl
   * @param {string} password
   * @return {Promise<{ success: boolean; message: string }>
   */
  async testRemoteConnection(
    hostUrl: string,
    password: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      if (!hostUrl || !password) {
        return {
          success: false,
          message: 'Host URL and password are required',
        };
      }

      // Clean up the URL
      const cleanUrl = hostUrl.trim().replace(/\/$/, '');
      const testUrl = `${cleanUrl}/api/remote/ping/${encodeURIComponent(password)}`;

      this.logger.debug(`Testing remote connection to: ${cleanUrl}`);

      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Set a reasonable timeout
        signal: AbortSignal.timeout(10000), // 10 seconds
      });

      if (response.ok) {
        const result = await response.json();
        if (result === true) {
          return {
            success: true,
            message: 'Connection successful! Host is reachable and password is correct.',
          };
        }
      }

      // Handle different HTTP status codes
      switch (response.status) {
        case 401:
          return {
            success: false,
            message: 'Authentication failed. Please check your password.',
          };
        case 404:
          return {
            success: false,
            message: 'Host not found. Please check the URL.',
          };
        case 500:
          return {
            success: false,
            message: 'Host server error. The remote host may not be configured properly.',
          };
        default:
          return {
            success: false,
            message: `Connection failed with status ${response.status}`,
          };
      }
    } catch (error) {
      this.logger.withError(error).error('Remote connection test failed');

      if (error instanceof TypeError && error.message.includes('fetch')) {
        return {
          success: false,
          message: 'Network error. Please check the host URL and ensure the host is running.',
        };
      }

      if (error.name === 'AbortError') {
        return {
          success: false,
          message: 'Connection timeout. The host may be unreachable.',
        };
      }

      return {
        success: false,
        message: `Connection test failed: ${error.message}`,
      };
    }
  }
}
