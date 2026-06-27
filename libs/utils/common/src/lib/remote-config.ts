import { readFileSync, statSync, writeFileSync } from 'fs';
import { readFile, stat, writeFile } from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import type { RemoteConfig } from '@postybirb/types';

export type RemoteConfigStoreConfig = {
  storagePath: string;
};

// Background mtime check interval (1 minute)
const CACHE_CHECK_INTERVAL_MS = 60_000;

export class RemoteConfigStore {
  private storagePath: string | null = null;

  private cachedConfig: RemoteConfig | null = null;

  private cachedMtime: number | null = null;

  private cacheCheckInterval: NodeJS.Timeout | null = null;

  /**
   * Configure the on-disk location of `remote-config.json`. Must be called
   * once during application startup (e.g. from apps/postybirb's electron
   * main) before any other method on this store is invoked.
   */
  configure(config: RemoteConfigStoreConfig): void {
    this.storagePath = config.storagePath;
  }

  async get(): Promise<RemoteConfig> {
    if (this.cachedConfig !== null) {
      return this.cachedConfig;
    }

    await this.ensureExists();
    const configPath = this.requirePath();

    const [configContent, fileStat] = await Promise.all([
      readFile(configPath, 'utf-8'),
      stat(configPath),
    ]);

    const remoteConfig = JSON.parse(configContent) as RemoteConfig;

    this.cachedConfig = remoteConfig;
    this.cachedMtime = fileStat.mtimeMs;

    this.startCacheInvalidationCheck();

    return remoteConfig;
  }

  getSync(): RemoteConfig | null {
    if (this.cachedConfig !== null) {
      return this.cachedConfig;
    }

    try {
      const configPath = this.requirePath();

      try {
        statSync(configPath);
      } catch {
        this.createSync();
      }

      const configContent = readFileSync(configPath, 'utf-8');
      const fileStat = statSync(configPath);
      const remoteConfig = JSON.parse(configContent) as RemoteConfig;

      this.cachedConfig = remoteConfig;
      this.cachedMtime = fileStat.mtimeMs;

      this.startCacheInvalidationCheck();

      return remoteConfig;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to read remote config synchronously', e);
      return null;
    }
  }

  /** Stop the background cache invalidation interval. Useful for tests. */
  dispose(): void {
    if (this.cacheCheckInterval) {
      clearInterval(this.cacheCheckInterval);
      this.cacheCheckInterval = null;
    }
    this.cachedConfig = null;
    this.cachedMtime = null;
  }

  private requirePath(): string {
    if (!this.storagePath) {
      throw new Error(
        'remote-config path is not configured; call RemoteConfigManager.configure() during startup',
      );
    }
    return this.storagePath;
  }

  private async ensureExists(): Promise<void> {
    try {
      await stat(this.requirePath());
    } catch {
      await this.create();
    }
  }

  private create(): Promise<void> {
    const config: RemoteConfig = {
      password: uuidv4(),
      enabled: true,
    };
    return writeFile(this.requirePath(), JSON.stringify(config, null, 2), {
      encoding: 'utf-8',
    });
  }

  private createSync(): void {
    const config: RemoteConfig = {
      password: uuidv4(),
      enabled: true,
    };
    writeFileSync(this.requirePath(), JSON.stringify(config, null, 2), {
      encoding: 'utf-8',
    });
  }

  /**
   * Start background interval to check if config file has changed.
   * Clears the cache if mtime differs, so the next get() call will re-read.
   */
  private startCacheInvalidationCheck(): void {
    if (this.cacheCheckInterval) return;

    this.cacheCheckInterval = setInterval(async () => {
      if (this.cachedMtime === null) return;

      try {
        const configPath = this.requirePath();
        const fileStat = await stat(configPath);
        const currentMtime = fileStat.mtimeMs;

        if (currentMtime !== this.cachedMtime) {
          this.cachedConfig = null;
          this.cachedMtime = null;
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Remote config cache invalidation', e);
        this.cachedConfig = null;
        this.cachedMtime = null;
      }
    }, CACHE_CHECK_INTERVAL_MS);
  }
}

export const RemoteConfigManager = new RemoteConfigStore();
