import {
  accessSync,
  mkdirSync,
  readFileSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from 'fs';
import { readFile, unlink, writeFile } from 'fs/promises';
import { POSTYBIRB_DIRECTORY } from './directories';

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

export function deleteDirSync(path: string) {
  validatePath(path);
  try {
    rmSync(path, { recursive: true });
  } catch {
    // Nothing
  }
}

export function writeSync(path: string, data: string | Buffer) {
  validatePath(path);
  writeFileSync(path, Buffer.from(data));
}

export function write(path: string, data: string | Buffer) {
  validatePath(path);
  return writeFile(path, data);
}

export function writeJson(path: string, data: Record<string, unknown>) {
  return write(path, Buffer.from(JSON.stringify(data, null, 1)));
}

export function writeJsonSync(path: string, data: Record<string, unknown>) {
  writeSync(path, Buffer.from(JSON.stringify(data, null, 1)));
}

export function read(path: string) {
  validatePath(path);
  return readFile(path);
}

export function readSync(path: string): Buffer {
  validatePath(path);
  return readFileSync(path);
}

export function readJson<T extends Record<string, unknown>>(path: string) {
  return read(path).then((buffer) => JSON.parse(buffer.toString()) as T);
}

export function readJsonSync<T extends Record<string, unknown>>(
  path: string
): T {
  return JSON.parse(readSync(path).toString());
}

export function removeFile(path: string) {
  validatePath(path);
  return unlink(path);
}

export function removeFileSync(path: string) {
  validatePath(path);
  unlinkSync(path);
}
