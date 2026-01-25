import { app } from 'electron';
import { readFile, stat, writeFile } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

export type RemoteConfig = {
  password: string;
  enabled: boolean;
};

function getRemoteConfigPath(): string {
  return join(app.getPath('appData'), 'postybirb', 'remote-config.json');
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

async function ensureRemoteConfigExists(): Promise<void> {
  try {
    await stat(getRemoteConfigPath());
  } catch {
    await createRemoteConfig();
  }
}

export async function getRemoteConfig(): Promise<RemoteConfig> {
  await ensureRemoteConfigExists();
  const configPath = getRemoteConfigPath();
  const configContent = await readFile(configPath, 'utf-8');
  console.log({ REMOTE_CONFIG: configContent });
  return JSON.parse(configContent) as RemoteConfig;
}
