import {
  BadRequestException,
  Injectable,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import {
  applyGlobalProxyConfig,
  invalidateAppliedGlobalProxyFingerprint,
  probePoolEntryConnection,
} from '@postybirb/http';
import { Settings, SettingsRepository } from '@postybirb/database';
import { SETTINGS_UPDATES } from '@postybirb/socket-events';
import { EntityId, SettingsConstants } from '@postybirb/types';
import {
  isProxyConfiguration,
  mergeProxyPoolPasswords,
  normalizeProxyPoolEntry,
  prepareProxyConfiguration,
  validateProxyConfiguration,
} from '@postybirb/types';
import {
  buildProxyRules,
  IsTestEnvironment,
  PostyBirbEnvConfig,
  shouldBypassProxyForUrl,
  StartupOptions,
  StartupOptionsManager,
  asEnabledProxyProfile,
} from '@postybirb/utils/common';
import { eq } from 'drizzle-orm';
import { PostyBirbService } from '../common/service/postybirb-service';
import { WSGateway } from '../web-socket/web-socket-gateway';
import { TestProxyPoolEntryDto } from './dtos/update-proxy-settings.dto';
import { UpdateSettingsDto } from './dtos/update-settings.dto';
import { UpdateStartupSettingsDto } from './dtos/update-startup-settings.dto';

@Injectable()
export class SettingsService
  extends PostyBirbService<SettingsRepository>
  implements OnModuleInit
{
  constructor(@Optional() webSocket: WSGateway) {
    super(new SettingsRepository(), webSocket);
    this.repository.subscribe('SettingsSchema', () => this.emit());
  }

  /**
   * Initializes default settings if required.
   * Also updates existing settings with any new default fields that might be missing.
   * Heavy merge operations are deferred to avoid blocking application startup.
   */
  async onModuleInit() {
    const defaultSettingsCount = await this.repository.count(
      eq(this.table.profile, SettingsConstants.DEFAULT_PROFILE_NAME),
    );

    if (!defaultSettingsCount) {
      this.createDefaultSettings();
    } else {
      // Defer the settings merge check to avoid blocking startup
      setImmediate(async () => {
        // Get existing default settings
        const existingSettings = await this.getDefaultSettings();
        if (existingSettings) {
          // Check if there are any missing fields compared to the current default settings
          const currentDefaults = SettingsConstants.DEFAULT_SETTINGS;
          let hasChanges = false;
          const updatedSettings = { ...existingSettings.settings };

          // Recursively merge missing fields
          const mergeObjects = (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            target: any,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            source: any,
            path = '',
          ): boolean => {
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
      });
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
    return StartupOptionsManager.get();
  }

  /**
   * Gets the default settings.
   */
  public getDefaultSettings() {
    return this.repository.findOne({
      where: (setting, { eq: equals }) =>
        equals(setting.profile, SettingsConstants.DEFAULT_PROFILE_NAME),
    }) as Promise<Settings>;
  }

  /**
   * Tests whether outbound requests work through the provided proxy settings.
   * Applies the given config temporarily, verifies traffic is routed through a
   * proxy, then restores the persisted startup proxy settings.
   */
  async testProxyConnection(
    poolEntryDto: TestProxyPoolEntryDto,
  ): Promise<{ success: boolean; message: string }> {
    const saved = StartupOptionsManager.get().proxy;
    const existing = saved.pool.find((entry) => entry.id === poolEntryDto.id);
    const entry = normalizeProxyPoolEntry({
      ...poolEntryDto,
      password: poolEntryDto.password?.trim()
        ? poolEntryDto.password
        : existing?.password ?? '',
    });

    if (!entry.host) {
      return {
        success: false,
        message: 'Proxy host is required',
      };
    }

    const proxyPort = parseInt(entry.port, 10);
    if (Number.isNaN(proxyPort) || proxyPort < 1 || proxyPort > 65535) {
      return {
        success: false,
        message: 'Invalid proxy port',
      };
    }

    if (!buildProxyRules(asEnabledProxyProfile(entry))) {
      return {
        success: false,
        message: 'Proxy host and port are required',
      };
    }

    const testUrl = 'https://www.google.com/generate_204';

    try {
      const { statusCode } = await probePoolEntryConnection(entry, testUrl, {
        method: 'HEAD',
        timeoutMs: 15_000,
      });

      if (statusCode === 407) {
        return {
          success: false,
          message:
            'Proxy authentication failed. Check username and password.',
        };
      }

      if (statusCode >= 200 && statusCode < 400) {
        return {
          success: true,
          message: 'Proxy connection test succeeded',
        };
      }

      return {
        success: false,
        message: `Unexpected response status: ${statusCode}`,
      };
    } catch (error) {
      this.logger.withError(error).warn('Proxy connection test failed');
      const message = error instanceof Error ? error.message : String(error);

      if (entry.type === 'socks5') {
        return {
          success: false,
          message:
            'SOCKS5 connection failed. Check host and port. If your provider gives an HTTP proxy URL, switch the type to HTTP(S).',
        };
      }

      if (/SOCKS/i.test(message)) {
        return {
          success: false,
          message:
            'Connection failed over SOCKS. Try HTTP(S) as the proxy type if your provider uses an HTTP proxy endpoint.',
        };
      }

      return {
        success: false,
        message: 'Could not reach the test URL through the configured proxy',
      };
    }
  }

  /**
   * Updates app startup settings.
   */
  public async updateStartupSettings(startUpOptions: UpdateStartupSettingsDto) {
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

    let proxyUpdated = false;
    const patch: Partial<StartupOptions> = {};

    if (startUpOptions.proxy) {
      if (!isProxyConfiguration(startUpOptions.proxy)) {
        throw new BadRequestException('Unsupported proxy configuration shape');
      }

      const current = StartupOptionsManager.get();
      const incomingMode = startUpOptions.proxy.mode;
      const mergedPacAccessToken =
        incomingMode === 'pac_routing'
          ? startUpOptions.proxy.pacAccessToken?.trim() ||
            current.proxy.pacAccessToken
          : undefined;

      const proxy = prepareProxyConfiguration({
        ...startUpOptions.proxy,
        pool: mergeProxyPoolPasswords(
          startUpOptions.proxy.pool,
          current.proxy.pool,
        ),
        pacAccessToken: mergedPacAccessToken,
      });

      const validation = validateProxyConfiguration(proxy);
      if (!validation.ok) {
        this.logger
          .withMetadata({ errors: validation.errors })
          .warn('Proxy configuration validation failed');
        throw new BadRequestException(validation.errors.join(' '));
      }

      patch.proxy = proxy;
      proxyUpdated = true;
    }

    if (startUpOptions.appDataPath !== undefined) {
      patch.appDataPath = startUpOptions.appDataPath;
    }
    if (startUpOptions.port !== undefined) {
      patch.port = startUpOptions.port;
    }
    if (startUpOptions.spellchecker !== undefined) {
      patch.spellchecker = startUpOptions.spellchecker;
    }
    if (startUpOptions.startAppOnSystemStartup !== undefined) {
      patch.startAppOnSystemStartup = startUpOptions.startAppOnSystemStartup;
    }

    StartupOptionsManager.set(patch);

    if (proxyUpdated && !IsTestEnvironment()) {
      invalidateAppliedGlobalProxyFingerprint();
      await applyGlobalProxyConfig(undefined, { force: true });
    }
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

      const cleanUrl = this.normalizeRemoteHostUrl(hostUrl);
      const testUrl = `${cleanUrl}/api/remote/ping/${encodeURIComponent(password)}`;
      const bypass = shouldBypassProxyForUrl(testUrl, {
        remoteHost: hostUrl,
        appPort: PostyBirbEnvConfig.port,
      });

      this.logger.debug('[Settings.testRemote]', {
        cleanUrl,
        bypass,
      });

      const fetchOptions: RequestInit = {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      };

      const response = await fetch(testUrl, fetchOptions);

      if (response.ok) {
        const result = await response.json();
        if (result === true) {
          return {
            success: true,
            message:
              'Connection successful! Host is reachable and password is correct.',
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
            message:
              'Host server error. The remote host may not be configured properly.',
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
          message:
            'Network error. Please check the host URL and ensure the host is running.',
        };
      }

      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          message: 'Connection timeout. The host may be unreachable.',
        };
      }

      return {
        success: false,
        message: `Connection test failed: ${(error as Error).message}`,
      };
    }
  }

  private normalizeRemoteHostUrl(hostUrl: string): string {
    const trimmed = hostUrl.trim().replace(/\/$/, '');
    if (!trimmed) {
      return trimmed;
    }

    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed;
    }

    return `https://${trimmed}`;
  }
}
