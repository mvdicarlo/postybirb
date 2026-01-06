import { clearDatabase } from '@postybirb/database';
import { ensureDirSync, PostyBirbDirectories, writeSync } from '@postybirb/fs';
import { readFileSync } from 'fs';
import { join } from 'path';
import { v4 } from 'uuid';
import { PostyBirbDatabase } from '../../drizzle/postybirb-database/postybirb-database';
import { LegacyTagConverterConverter } from './legacy-tag-converter.converter';

describe('LegacyTagConverterConverter', () => {
  let converter: LegacyTagConverterConverter;
  let testDataPath: string;
  let repository: PostyBirbDatabase<'TagConverterSchema'>;
  const ts = Date.now();

  beforeEach(async () => {
    clearDatabase();

    // Setup test data directory
    testDataPath = `${PostyBirbDirectories.DATA_DIRECTORY}/legacy-db/${ts}/TagConverter-${v4()}`;

    // Copy test data to temp directory
    const testDataDir = join(testDataPath, 'data');
    ensureDirSync(testDataDir);

    const sourceFile = join(__dirname, '../test-files/data/tag-converter.db');
    const testFile = readFileSync(sourceFile);
    const destFile = join(testDataDir, 'tag-converter.db');

    writeSync(destFile, testFile);

    converter = new LegacyTagConverterConverter(testDataPath);
    repository = new PostyBirbDatabase('TagConverterSchema');
  });

  it('should import and convert legacy tag converter data', async () => {
    await converter.import();

    const records = await repository.findAll();
    expect(records).toHaveLength(1);

    const record = records[0];
    // Verify ID is preserved
    expect(record.id).toBe('f499b833-b465-462a-bb3c-0983b35b3475');
    // Verify tag is preserved
    expect(record.tag).toBe('converter');
    // Verify legacy website IDs are mapped to modern ones (FurAffinity -> fur-affinity)
    expect(record.convertTo).toHaveProperty('fur-affinity');
    expect(record.convertTo['fur-affinity']).toBe('converted');
  });

  it('should handle empty conversions object', async () => {
    // Create test data with empty conversions
    const emptyConversionData = {
      _id: 'test-empty-id',
      created: '2023-10-01T12:00:00Z',
      lastUpdated: '2023-10-01T12:00:00Z',
      tag: 'empty-tag',
      conversions: {},
    };

    const testDataDir = join(testDataPath, 'data');
    const emptyTestFile = join(testDataDir, 'tag-converter.db');
    writeSync(
      emptyTestFile,
      Buffer.from(JSON.stringify(emptyConversionData) + '\n'),
    );

    await converter.import();

    const records = await repository.findAll();
    expect(records).toHaveLength(1);

    const record = records[0];
    expect(record.tag).toBe('empty-tag');
    expect(record.convertTo).toEqual({});
  });

  it('should map legacy website names to modern IDs', async () => {
    // Create test data with multiple legacy website names
    const multiWebsiteData = {
      _id: 'test-multi-id',
      created: '2023-10-01T12:00:00Z',
      lastUpdated: '2023-10-01T12:00:00Z',
      tag: 'multi-tag',
      conversions: {
        FurAffinity: 'fa-tag',
        DeviantArt: 'da-tag',
      },
    };

    const testDataDir = join(testDataPath, 'data');
    const multiTestFile = join(testDataDir, 'tag-converter.db');
    writeSync(
      multiTestFile,
      Buffer.from(JSON.stringify(multiWebsiteData) + '\n'),
    );

    await converter.import();

    const records = await repository.findAll();
    expect(records).toHaveLength(1);

    const record = records[0];
    expect(record.convertTo['fur-affinity']).toBe('fa-tag');
    expect(record.convertTo['deviant-art']).toBe('da-tag');
  });
});
