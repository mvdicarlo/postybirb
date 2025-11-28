import { clearDatabase } from '@postybirb/database';
import { ensureDirSync, PostyBirbDirectories, writeSync } from '@postybirb/fs';
import { readFileSync } from 'fs';
import { join } from 'path';
import { v4 } from 'uuid';
import { PostyBirbDatabase } from '../../drizzle/postybirb-database/postybirb-database';
import { LegacyTagGroupConverter } from './legacy-tag-group.converter';

describe('LegacyTagGroupConverter', () => {
  let converter: LegacyTagGroupConverter;
  let testDataPath: string;
  let repository: PostyBirbDatabase<'TagGroupSchema'>;
  const ts = Date.now();

  beforeAll(() => {
    PostyBirbDirectories.initializeDirectories();
  });

  beforeEach(async () => {
    clearDatabase();

    // Setup test data directory
    testDataPath = `${PostyBirbDirectories.DATA_DIRECTORY}/legacy-db/${ts}/TagGroup-${v4()}`;

    // Copy test data to temp directory
    const testDataDir = join(testDataPath, 'data');
    ensureDirSync(testDataDir);

    const sourceFile = join(__dirname, '../test-files/data/tag-group.db');
    const testFile = readFileSync(sourceFile);
    const destFile = join(testDataDir, 'tag-group.db');

    writeSync(destFile, testFile);

    converter = new LegacyTagGroupConverter(testDataPath);
    repository = new PostyBirbDatabase('TagGroupSchema');
  });

  it('should get modern database instance', () => {
    const db = converter.getModernDatabase();
    expect(db).toBeDefined();
    expect(db).toBeInstanceOf(PostyBirbDatabase);
  });

  it('should import and convert legacy tag group data', async () => {
    await converter.import();

    const records = await repository.findAll();
    expect(records).toHaveLength(1);

    const record = records[0];
    // Verify ID is preserved
    expect(record.id).toBe('f499b833-b465-462a-bb3c-0983b35b3475');
    // Verify alias is converted to name
    expect(record.name).toBe('converter');
    // Verify tags array is preserved
    expect(record.tags).toEqual(['tag1', 'tag2']);
  });

  it('should handle tag group with empty tags array', async () => {
    // Create test data with empty tags
    const emptyTagsData = {
      _id: 'test-empty-tags-id',
      created: '2023-10-01T12:00:00Z',
      lastUpdated: '2023-10-01T12:00:00Z',
      alias: 'empty-group',
      tags: [],
    };

    const testDataDir = join(testDataPath, 'data');
    const emptyTagsFile = join(testDataDir, 'tag-group.db');
    writeSync(emptyTagsFile, Buffer.from(JSON.stringify(emptyTagsData) + '\n'));

    await converter.import();

    const records = await repository.findAll();
    expect(records).toHaveLength(1);

    const record = records[0];
    expect(record.name).toBe('empty-group');
    expect(record.tags).toEqual([]);
  });

  it('should handle tag group with single tag', async () => {
    // Create test data with single tag
    const singleTagData = {
      _id: 'test-single-tag-id',
      created: '2023-10-01T12:00:00Z',
      lastUpdated: '2023-10-01T12:00:00Z',
      alias: 'single-tag-group',
      tags: ['lonely-tag'],
    };

    const testDataDir = join(testDataPath, 'data');
    const singleTagFile = join(testDataDir, 'tag-group.db');
    writeSync(singleTagFile, Buffer.from(JSON.stringify(singleTagData) + '\n'));

    await converter.import();

    const records = await repository.findAll();
    expect(records).toHaveLength(1);

    const record = records[0];
    expect(record.name).toBe('single-tag-group');
    expect(record.tags).toHaveLength(1);
    expect(record.tags[0]).toBe('lonely-tag');
  });

  it('should handle tag group with special characters in name', async () => {
    // Create test data with special characters
    const specialCharsData = {
      _id: 'test-special-chars-id',
      created: '2023-10-01T12:00:00Z',
      lastUpdated: '2023-10-01T12:00:00Z',
      alias: 'group-with-special!@#$%',
      tags: ['tag1', 'tag2'],
    };

    const testDataDir = join(testDataPath, 'data');
    const specialCharsFile = join(testDataDir, 'tag-group.db');
    writeSync(
      specialCharsFile,
      Buffer.from(JSON.stringify(specialCharsData) + '\n'),
    );

    await converter.import();

    const records = await repository.findAll();
    expect(records).toHaveLength(1);

    const record = records[0];
    expect(record.name).toBe('group-with-special!@#$%');
  });
});
