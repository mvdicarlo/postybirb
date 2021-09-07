import TestWebsite from './test.website';
import { join } from 'path';
import { readJsonSync, PostyBirbDirectories } from '@postybirb/fs';
import { rmdirSync } from 'fs';

const { POSTYBIRB_DIRECTORY, WEBSITE_DATA_DIRECTORY, initializeDirectories } =
  PostyBirbDirectories;

initializeDirectories();

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
