import { app } from 'electron';
import { readFileSync, statSync, writeFileSync } from 'fs';
import { readFile, stat, writeFile } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

export type RemoteConfig = {
  password: string;
  enabled: boolean;
};

// Cache for remote config
let cachedConfig: RemoteConfig | null = null;
let cachedMtime: number | null = null;
let cacheCheckInterval: NodeJS.Timeout | null = null;

// Check interval in milliseconds (1 minute)
const CACHE_CHECK_INTERVAL_MS = 60_000;

function getRemoteConfigPath(): string {
  return join(app.getPath('userData'), 'remote-config.json');
}

function createRemoteConfig(): Promise<void> {
  const config: RemoteConfig = {
    password: uuidv4(),
    enabled: true,
  };
  return writeFile(getRemoteConfigPath(), JSON.stringify(config, null, 2), {
    encoding: 'utf-8',
  });
}

function createRemoteConfigSync(): void {
  const config: RemoteConfig = {
    password: uuidv4(),
    enabled: true,
  };
  writeFileSync(getRemoteConfigPath(), JSON.stringify(config, null, 2), {
    encoding: 'utf-8',
  });
}

async function ensureRemoteConfigExists(): Promise<void> {
  try {
    await stat(getRemoteConfigPath());
  } catch {
    await createRemoteConfig();
  }
}

/**
 * Start background interval to check if config file has changed.
 * Clears the cache if mtime differs, so next getRemoteConfig() call will re-read.
 */
function startCacheInvalidationCheck(): void {
  if (cacheCheckInterval) return; // Already running

  cacheCheckInterval = setInterval(async () => {
    if (cachedMtime === null) return; // No cached value to invalidate

    try {
      const configPath = getRemoteConfigPath();
      const fileStat = await stat(configPath);
      const currentMtime = fileStat.mtimeMs;

      if (currentMtime !== cachedMtime) {
        // File has changed, clear cache
        cachedConfig = null;
        cachedMtime = null;
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Remote config cache invalidation', e);
      // File might have been deleted, clear cache
      cachedConfig = null;
      cachedMtime = null;
    }
  }, CACHE_CHECK_INTERVAL_MS);
}

export async function getRemoteConfig(): Promise<RemoteConfig> {
  // Return cached value if available
  if (cachedConfig !== null) {
    return cachedConfig;
  }

  await ensureRemoteConfigExists();
  const configPath = getRemoteConfigPath();

  // Read file and get mtime
  const [configContent, fileStat] = await Promise.all([
    readFile(configPath, 'utf-8'),
    stat(configPath),
  ]);

  const remoteConfig = JSON.parse(configContent) as RemoteConfig;

  // Cache the config and mtime
  cachedConfig = remoteConfig;
  cachedMtime = fileStat.mtimeMs;

  // Start background check if not already running
  startCacheInvalidationCheck();

  return remoteConfig;
}

export function getRemoteConfigSync(): RemoteConfig | null {
  if (cachedConfig !== null) {
    return cachedConfig;
  }

  try {
    const configPath = getRemoteConfigPath();

    // Ensure config file exists
    try {
      statSync(configPath);
    } catch {
      createRemoteConfigSync();
    }

    const configContent = readFileSync(configPath, 'utf-8');
    const fileStat = statSync(configPath);
    const remoteConfig = JSON.parse(configContent) as RemoteConfig;

    // Cache the config and mtime
    cachedConfig = remoteConfig;
    cachedMtime = fileStat.mtimeMs;

    // Start background check if not already running
    startCacheInvalidationCheck();

    return remoteConfig;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Failed to read remote config synchronously', e);
    return null;
  }
}
