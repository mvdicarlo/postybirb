import { mkdirSync, accessSync, readFileSync, writeFileSync } from 'fs';
import { POSTYBIRB_DIRECTORY } from './data-storage-directories';

export function ensureDirSync(path: string) {
  try {
    accessSync(path);
  } catch {
    mkdirSync(path, { recursive: true });
  }
}

// TODO BUG: encoding isn't writing as conversion
export function writeJsonSync(
  path: string,
  data: Record<string, unknown>,
  encoding?: BufferEncoding
) {
  writeSync(path, JSON.stringify(data, null, 1), encoding);
}

export function writeSync(
  path: string,
  data: string | Buffer,
  encoding?: BufferEncoding
) {
  if (!path.startsWith(POSTYBIRB_DIRECTORY)) {
    throw new Error('Cannot write outside of PostyBirb directory');
  }

  writeFileSync(path, data, { encoding });
}

export function readJsonSync<T extends Record<string, unknown>>(
  path: string,
  encoding?: BufferEncoding
): T {
  return JSON.parse(readFileSync(path, encoding));
}
