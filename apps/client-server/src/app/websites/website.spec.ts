import TestWebsite from './implementations/test/test.website';
import { join } from 'path';
import { readJsonSync, PostyBirbDirectories } from '@postybirb/fs';
import { rmdirSync } from 'fs';
import { TestMetadata } from '@postybirb/website-metadata';

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

    await website.onInitialize();
    await website.onLogin();

    const filePath = join(WEBSITE_DATA_DIRECTORY, 'test-store.json');

    const data = readJsonSync(filePath);
    expect(data).toEqual({ test: 'test-mode' });
  });

  it('should set website metadata', () => {
    expect(TestWebsite.prototype.metadata).toEqual({
      ...TestMetadata,
      refreshInterval: 60_000 * 60,
    });
  });
});
