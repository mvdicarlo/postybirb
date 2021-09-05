import {
  mkdirSync,
  accessSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
} from 'fs';
import { POSTYBIRB_DIRECTORY } from './data-storage-directories';

function validatePath(path: string) {
  if (!path.startsWith(POSTYBIRB_DIRECTORY)) {
    throw new Error('Cannot write outside of PostyBirb directory');
  }
}

export function ensureDirSync(path: string) {
  try {
    accessSync(path);
  } catch {
    mkdirSync(path, { recursive: true });
  }
}

export function writeSync(path: string, data: string | Buffer) {
  validatePath(path);
  writeFileSync(path, Buffer.from(data));
}

export function writeJsonSync(path: string, data: Record<string, unknown>) {
  writeSync(path, Buffer.from(JSON.stringify(data, null, 1)));
}

export function readSync(path: string): Buffer {
  validatePath(path);
  return readFileSync(path);
}

export function readJsonSync<T extends Record<string, unknown>>(
  path: string
): T {
  return JSON.parse(readSync(path).toString());
}

export function removeFileSync(path: string) {
  validatePath(path);
  unlinkSync(path);
}
