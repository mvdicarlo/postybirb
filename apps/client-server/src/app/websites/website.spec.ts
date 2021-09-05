import TestWebsite from './test.website';
import { join } from 'path';
import { readJsonSync } from '../data-storage/data-storage.util';
import { rmdirSync } from 'fs';
import {
  POSTYBIRB_DIRECTORY,
  WEBSITE_DATA_DIRECTORY,
} from '../data-storage/data-storage-directories';

afterAll(() => {
  rmdirSync(POSTYBIRB_DIRECTORY, { recursive: true });
});

describe('Website', () => {
  it('should store data', async () => {
    const website = new TestWebsite({
      id: 'store',
      name: 'test',
      website: 'test',
    });

    website.onLogin();

    const filePath = join(WEBSITE_DATA_DIRECTORY, 'test-store.json');

    const data = readJsonSync(filePath);
    expect(data).toEqual({ test: 'test-mode' });
  });
});
