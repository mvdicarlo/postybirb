import { rmdirSync } from 'fs';
import { join } from 'path';
import { POSTYBIRB_DIRECTORY, initializeDirectories } from './directories';
import {
  writeSync,
  readSync,
  writeJsonSync,
  readJsonSync,
  removeFileSync,
} from './fs';

let filepath: string;

initializeDirectories();

beforeEach(() => {
  filepath = join(POSTYBIRB_DIRECTORY, `${Date.now()}.test.txt`);
});

afterAll(() => {
  rmdirSync(POSTYBIRB_DIRECTORY, { recursive: true });
});

describe('PostyBirbFS', () => {
  describe('writeSync/readSync', () => {
    it('should write file', () => {
      const data = 'test data';
      writeSync(filepath, data);

      const readAsBuffer = readSync(filepath);
      expect(readAsBuffer).toEqual(Buffer.from(data));

      const readData = readSync(filepath);
      expect(readData.toString()).toBe(data);
    });

    it('should write json file', () => {
      const data = { test: false };
      writeJsonSync(filepath, data);

      const readData = readJsonSync(filepath);
      expect(readData).toEqual(data);
    });

    it('should not write outside of allowed directory', () => {
      const data = 'test data';
      let err: Error;
      try {
        writeSync(`./test/file.txt`, data);
      } catch (e) {
        err = e;
      }

      expect(err).toBeTruthy();
      expect(err.message).toBe(
        'Cannot read/write outside of PostyBirb directory'
      );
    });
  });

  describe('removeFile', () => {
    it('should not remove file outside of', () => {
      let err: Error;
      try {
        removeFileSync(`./test/file.txt`);
      } catch (e) {
        err = e;
      }

      expect(err).toBeTruthy();
      expect(err.message).toBe(
        'Cannot read/write outside of PostyBirb directory'
      );
    });
  });
});
