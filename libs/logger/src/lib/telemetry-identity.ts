import { PostyBirbDirectories } from '@postybirb/fs';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { isTelemetryInstallationId } from './telemetry-privacy';

let installationId: string | undefined;

function hasFileErrorCode(error: unknown, code: string): boolean {
  return error instanceof Error && 'code' in error && error.code === code;
}

function readInstallationId(filename: string): string {
  const value = readFileSync(filename, 'utf8').trim();
  if (!isTelemetryInstallationId(value)) {
    throw new Error('Stored telemetry installation ID is not a valid UUID v4');
  }
  return value;
}

function loadInstallationId(): string {
  const filename = join(
    PostyBirbDirectories.POSTYBIRB_DIRECTORY,
    'telemetry-installation-id.txt',
  );

  try {
    return readInstallationId(filename);
  } catch (error) {
    if (!hasFileErrorCode(error, 'ENOENT')) throw error;
  }

  const value = uuidv4();
  try {
    writeFileSync(filename, `${value}\n`, {
      encoding: 'utf8',
      flag: 'wx',
      mode: 0o600,
    });
    return value;
  } catch (error) {
    if (!hasFileErrorCode(error, 'EEXIST')) throw error;
    return readInstallationId(filename);
  }
}

export function getTelemetryInstallationId(): string {
  installationId ??= loadInstallationId();
  return installationId;
}
