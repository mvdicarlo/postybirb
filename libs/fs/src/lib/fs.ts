import {
  mkdirSync,
  accessSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
  writeFile,
  readFile,
  unlink,
} from 'fs';
import { promisify } from 'util';
import { POSTYBIRB_DIRECTORY } from './directories';

const writeFilePromise = promisify(writeFile);
const readFilePromise = promisify(readFile);
const unlinkPromise = promisify(unlink);

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

export function write(path: string, data: string | Buffer) {
  validatePath(path);
  return writeFilePromise(path, data);
}

export function writeJson(path: string, data: Record<string, unknown>) {
  return write(path, Buffer.from(JSON.stringify(data, null, 1)));
}

export function writeJsonSync(path: string, data: Record<string, unknown>) {
  writeSync(path, Buffer.from(JSON.stringify(data, null, 1)));
}

export function read(path: string) {
  validatePath(path);
  return readFilePromise(path);
}

export function readSync(path: string): Buffer {
  validatePath(path);
  return readFileSync(path);
}

export function readJson<T extends Record<string, unknown>>(path: string) {
  return read(path).then((buffer) => {
    return JSON.parse(buffer.toString()) as T;
  });
}

export function readJsonSync<T extends Record<string, unknown>>(
  path: string
): T {
  return JSON.parse(readSync(path).toString());
}

export function removeFile(path: string) {
  validatePath(path);
  return unlinkPromise(path);
}

export function removeFileSync(path: string) {
  validatePath(path);
  unlinkSync(path);
}
