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
  const ts = Date.now();

  beforeAll(() => {
    PostyBirbDirectories.initializeDirectories();
  });

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
});
