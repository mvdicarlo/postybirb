import { clearDatabase } from '@postybirb/database';
import { ensureDirSync, PostyBirbDirectories, writeSync } from '@postybirb/fs';
import { readFileSync } from 'fs';
import { join } from 'path';
import { v4 } from 'uuid';
import { PostyBirbDatabase } from '../../drizzle/postybirb-database/postybirb-database';
import { LegacyUserAccountConverter } from './legacy-user-account.converter';

describe('LegacyUserAccountConverter', () => {
  let converter: LegacyUserAccountConverter;
  let testDataPath: string;
  let repository: PostyBirbDatabase<'AccountSchema'>;
  let websiteDataRepository: PostyBirbDatabase<'WebsiteDataSchema'>;
  const ts = Date.now();

  beforeEach(async () => {
    clearDatabase();

    // Setup test data directory
    testDataPath = `${PostyBirbDirectories.DATA_DIRECTORY}/legacy-db/${ts}/Account-${v4()}`;

    // Copy test data to temp directory
    const testDataDir = join(testDataPath, 'data');
    ensureDirSync(testDataDir);

    const sourceFile = join(__dirname, '../test-files/data/accounts.db');
    const testFile = readFileSync(sourceFile);
    const destFile = join(testDataDir, 'accounts.db');

    writeSync(destFile, testFile);

    converter = new LegacyUserAccountConverter(testDataPath);
    repository = new PostyBirbDatabase('AccountSchema');
    websiteDataRepository = new PostyBirbDatabase('WebsiteDataSchema');
  });

  it('should import and convert legacy user account data', async () => {
    await converter.import();

    const records = await repository.findAll();
    expect(records).toHaveLength(2);

    // Verify FurAffinity account
    const faAccount = records.find(
      (r) => r.id === 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    );
    expect(faAccount).toBeDefined();
    expect(faAccount!.name).toBe('FurAffinity Main');
    expect(faAccount!.website).toBe('fur-affinity');

    // Verify DeviantArt account
    const daAccount = records.find(
      (r) => r.id === 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    );
    expect(daAccount).toBeDefined();
    expect(daAccount!.name).toBe('DeviantArt Account');
    expect(daAccount!.website).toBe('deviant-art');
  });

  it('should skip accounts for deprecated websites', async () => {
    // Create test data with deprecated website
    const deprecatedData = {
      _id: 'deprecated-id',
      created: '2023-10-01T12:00:00Z',
      lastUpdated: '2023-10-01T12:00:00Z',
      alias: 'FurryNetwork Account',
      website: 'FurryNetwork',
      data: { username: 'test' },
    };

    const testDataDir = join(testDataPath, 'data');
    const deprecatedFile = join(testDataDir, 'accounts.db');
    writeSync(
      deprecatedFile,
      Buffer.from(JSON.stringify(deprecatedData) + '\n'),
    );

    await converter.import();

    const records = await repository.findAll();
    // Should be empty because FurryNetwork is deprecated
    expect(records).toHaveLength(0);
  });

  describe('WebsiteData transformation', () => {
    beforeEach(() => {
      // Use the accounts-with-websitedata.db test file
      const testDataDir = join(testDataPath, 'data');
      const sourceFile = join(
        __dirname,
        '../test-files/data/accounts-with-websitedata.db',
      );
      const testFile = readFileSync(sourceFile);
      const destFile = join(testDataDir, 'accounts.db');
      writeSync(destFile, testFile);
    });

    it('should import Twitter account with transformed WebsiteData', async () => {
      await converter.import();

      const account = await repository.findById('twitter-test-id-001');
      expect(account).toBeDefined();
      expect(account!.website).toBe('twitter');

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

    it('should import Discord account with transformed WebsiteData', async () => {
      await converter.import();

      const account = await repository.findById('discord-test-id-002');
      expect(account).toBeDefined();
      expect(account!.website).toBe('discord');

      const websiteData = await websiteDataRepository.findById(
        'discord-test-id-002',
      );
      expect(websiteData).toBeDefined();
      expect(websiteData!.data).toEqual({
        webhook:
          'https://discord.com/api/webhooks/123456789/abcdefghijklmnop',
        serverLevel: 2,
        isForum: true,
      });
    });

    it('should import Telegram account with transformed WebsiteData', async () => {
      await converter.import();

      const account = await repository.findById('telegram-test-id-003');
      expect(account).toBeDefined();
      expect(account!.website).toBe('telegram');

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

    it('should import Mastodon account with transformed WebsiteData', async () => {
      await converter.import();

      const account = await repository.findById('mastodon-test-id-004');
      expect(account).toBeDefined();
      expect(account!.website).toBe('mastodon');

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

    it('should import Bluesky account with transformed WebsiteData', async () => {
      await converter.import();

      const account = await repository.findById('bluesky-test-id-005');
      expect(account).toBeDefined();
      expect(account!.website).toBe('bluesky');

      const websiteData = await websiteDataRepository.findById(
        'bluesky-test-id-005',
      );
      expect(websiteData).toBeDefined();
      expect(websiteData!.data).toEqual({
        username: 'bluesky.user.bsky.social',
        password: 'app_password_123',
      });
    });

    it('should import e621 account with transformed WebsiteData', async () => {
      await converter.import();

      const account = await repository.findById('e621-test-id-007');
      expect(account).toBeDefined();
      expect(account!.website).toBe('e621');

      const websiteData = await websiteDataRepository.findById(
        'e621-test-id-007',
      );
      expect(websiteData).toBeDefined();
      expect(websiteData!.data).toEqual({
        username: 'e621_user',
        key: 'api_key_xyz789',
      });
    });

    it('should import Custom webhook with transformed WebsiteData and fix typo', async () => {
      await converter.import();

      const account = await repository.findById('custom-test-id-009');
      expect(account).toBeDefined();
      expect(account!.website).toBe('custom');

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

    it('should import Pleroma account using MegalodonDataTransformer', async () => {
      await converter.import();

      const account = await repository.findById('pleroma-test-id-010');
      expect(account).toBeDefined();
      expect(account!.website).toBe('pleroma');

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

    it('should import Pixelfed account and normalize instance URL', async () => {
      await converter.import();

      const account = await repository.findById('pixelfed-test-id-011');
      expect(account).toBeDefined();
      expect(account!.website).toBe('pixelfed');

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
      await converter.import();

      const account = await repository.findById('furaffinity-test-id-012');
      expect(account).toBeDefined();
      expect(account!.website).toBe('fur-affinity');

      // FurAffinity uses browser cookies, not WebsiteData
      const websiteData = await websiteDataRepository.findById(
        'furaffinity-test-id-012',
      );
      expect(websiteData).toBeNull();
    });
  });
});
