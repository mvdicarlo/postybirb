import { clearDatabase } from '@postybirb/database';
import { ensureDirSync, PostyBirbDirectories, writeSync } from '@postybirb/fs';
import { readFileSync } from 'fs';
import { join } from 'path';
import { v4 } from 'uuid';
import { PostyBirbDatabase } from '../../drizzle/postybirb-database/postybirb-database';
import { LegacyUserAccountConverter } from './legacy-user-account.converter';
import { LegacyWebsiteDataConverter } from './legacy-website-data.converter';

describe('LegacyWebsiteDataConverter', () => {
  let accountConverter: LegacyUserAccountConverter;
  let websiteDataConverter: LegacyWebsiteDataConverter;
  let testDataPath: string;
  let accountRepository: PostyBirbDatabase<'AccountSchema'>;
  let websiteDataRepository: PostyBirbDatabase<'WebsiteDataSchema'>;
  const ts = Date.now();

  beforeEach(async () => {
    clearDatabase();

    // Setup test data directory
    testDataPath = `${PostyBirbDirectories.DATA_DIRECTORY}/legacy-db/${ts}/WebsiteData-${v4()}`;

    // Copy test data to temp directory
    const testDataDir = join(testDataPath, 'data');
    ensureDirSync(testDataDir);

    // Use the accounts-with-websitedata.db test file
    const sourceFile = join(
      __dirname,
      '../test-files/data/accounts-with-websitedata.db',
    );
    const testFile = readFileSync(sourceFile);
    const destFile = join(testDataDir, 'accounts.db');
    writeSync(destFile, testFile);

    accountConverter = new LegacyUserAccountConverter(testDataPath);
    websiteDataConverter = new LegacyWebsiteDataConverter(testDataPath);
    accountRepository = new PostyBirbDatabase('AccountSchema');
    websiteDataRepository = new PostyBirbDatabase('WebsiteDataSchema');
  });

  /**
   * Helper to run both converters in the correct order.
   * Account converter must run first due to foreign key dependency.
   */
  async function runConverters() {
    // Accounts must be created first (WebsiteData has FK reference)
    await accountConverter.import();
    await websiteDataConverter.import();
  }

  it('should import Twitter WebsiteData with transformed credentials', async () => {
    await runConverters();

    const websiteData = await websiteDataRepository.findById(
      'twitter-test-id-001',
    );
    expect(websiteData).toBeDefined();
    expect(websiteData!.data).toEqual({
      apiKey: 'consumer_key_123',
      apiSecret: 'consumer_secret_456',
      accessToken: 'access_token_789',
      accessTokenSecret: 'access_secret_012',
      screenName: 'test_user',
      userId: '123456789',
    });
  });

  it('should import Discord WebsiteData with webhook config', async () => {
    await runConverters();

    const websiteData = await websiteDataRepository.findById(
      'discord-test-id-002',
    );
    expect(websiteData).toBeDefined();
    expect(websiteData!.data).toEqual({
      webhook: 'https://discord.com/api/webhooks/123456789/abcdefghijklmnop',
      serverLevel: 2,
      isForum: true,
    });
  });

  it('should import Telegram WebsiteData with app credentials', async () => {
    await runConverters();

    const websiteData = await websiteDataRepository.findById(
      'telegram-test-id-003',
    );
    expect(websiteData).toBeDefined();
    expect(websiteData!.data).toEqual({
      appId: 12345678, // Converted from string to number
      appHash: 'abcdef0123456789abcdef0123456789',
      phoneNumber: '+1234567890',
      session: undefined,
      channels: [],
    });
  });

  it('should import Mastodon WebsiteData with normalized instance URL', async () => {
    await runConverters();

    const websiteData = await websiteDataRepository.findById(
      'mastodon-test-id-004',
    );
    expect(websiteData).toBeDefined();
    expect(websiteData!.data).toMatchObject({
      accessToken: 'mastodon_access_token_xyz',
      instanceUrl: 'mastodon.social', // Normalized (protocol stripped)
      username: 'mastodon_user',
    });
  });

  it('should import Bluesky WebsiteData with username and password', async () => {
    await runConverters();

    const websiteData = await websiteDataRepository.findById(
      'bluesky-test-id-005',
    );
    expect(websiteData).toBeDefined();
    expect(websiteData!.data).toEqual({
      username: 'bluesky.user.bsky.social',
      password: 'app_password_123',
    });
  });

  it('should import e621 WebsiteData with API key', async () => {
    await runConverters();

    const websiteData = await websiteDataRepository.findById('e621-test-id-007');
    expect(websiteData).toBeDefined();
    expect(websiteData!.data).toEqual({
      username: 'e621_user',
      key: 'api_key_xyz789',
    });
  });

  it('should import Custom webhook with fixed typo', async () => {
    await runConverters();

    const websiteData = await websiteDataRepository.findById(
      'custom-test-id-009',
    );
    expect(websiteData).toBeDefined();
    // Verify typo fix: thumbnaiField -> thumbnailField
    expect(websiteData!.data).toMatchObject({
      fileUrl: 'https://example.com/upload',
      descriptionField: 'description',
      headers: [{ name: 'Authorization', value: 'Bearer token123' }],
      thumbnailField: 'thumbnail', // Fixed from thumbnaiField
    });
  });

  it('should import Pleroma using MegalodonDataTransformer', async () => {
    await runConverters();

    const websiteData = await websiteDataRepository.findById(
      'pleroma-test-id-010',
    );
    expect(websiteData).toBeDefined();
    expect(websiteData!.data).toMatchObject({
      accessToken: 'pleroma_token_abc',
      instanceUrl: 'pleroma.example.com',
      username: 'pleroma_user',
    });
  });

  it('should import Pixelfed and normalize instance URL', async () => {
    await runConverters();

    const websiteData = await websiteDataRepository.findById(
      'pixelfed-test-id-011',
    );
    expect(websiteData).toBeDefined();
    expect(websiteData!.data).toMatchObject({
      accessToken: 'pixelfed_token_def',
      instanceUrl: 'pixelfed.social', // Protocol and trailing slash stripped
      username: 'pixelfed_user',
    });
  });

  it('should NOT create WebsiteData for browser-cookie websites (FurAffinity)', async () => {
    await runConverters();

    // FurAffinity uses browser cookies, not WebsiteData - no transformer exists
    const websiteData = await websiteDataRepository.findById(
      'furaffinity-test-id-012',
    );
    expect(websiteData).toBeNull();

    // But the account should exist
    const account = await accountRepository.findById('furaffinity-test-id-012');
    expect(account).toBeDefined();
    expect(account!.website).toBe('fur-affinity');
  });

  it('should skip deprecated websites', async () => {
    // Create test data with deprecated website
    const testDataDir = join(testDataPath, 'data');
    const deprecatedData = {
      _id: 'deprecated-id',
      created: '2023-10-01T12:00:00Z',
      lastUpdated: '2023-10-01T12:00:00Z',
      alias: 'FurryNetwork Account',
      website: 'FurryNetwork',
      data: { username: 'test' },
    };
    const deprecatedFile = join(testDataDir, 'accounts.db');
    writeSync(
      deprecatedFile,
      Buffer.from(JSON.stringify(deprecatedData) + '\n'),
    );

    // Run just the website data converter (account doesn't exist)
    await websiteDataConverter.import();

    // Should be empty because FurryNetwork is deprecated
    const records = await websiteDataRepository.findAll();
    expect(records).toHaveLength(0);
  });

  it('should handle accounts with transformer but missing data', async () => {
    // Create test data with Twitter account but no data field
    const testDataDir = join(testDataPath, 'data');
    const noDataAccount = {
      _id: 'twitter-no-data',
      created: '2023-10-01T12:00:00Z',
      lastUpdated: '2023-10-01T12:00:00Z',
      alias: 'Twitter No Data',
      website: 'Twitter',
      // data field is missing
    };
    const testFile = join(testDataDir, 'accounts.db');
    writeSync(testFile, Buffer.from(JSON.stringify(noDataAccount) + '\n'));

    // Create the account first
    await accountConverter.import();
    await websiteDataConverter.import();

    // WebsiteData should not be created
    const websiteData = await websiteDataRepository.findById('twitter-no-data');
    expect(websiteData).toBeNull();
  });
});
