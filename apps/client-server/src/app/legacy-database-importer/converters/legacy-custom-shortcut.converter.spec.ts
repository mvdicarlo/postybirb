import { clearDatabase } from '@postybirb/database';
import { ensureDirSync, PostyBirbDirectories, writeSync } from '@postybirb/fs';
import { readFileSync } from 'fs';
import { join } from 'path';
import { v4 } from 'uuid';
import { PostyBirbDatabase } from '../../drizzle/postybirb-database/postybirb-database';
import { LegacyCustomShortcutConverter } from './legacy-custom-shortcut.converter';

describe('LegacyCustomShortcutConverter', () => {
  let converter: LegacyCustomShortcutConverter;
  let testDataPath: string;
  let repository: PostyBirbDatabase<'CustomShortcutSchema'>;
  const ts = Date.now();

  beforeAll(() => {
    PostyBirbDirectories.initializeDirectories();
  });

  beforeEach(async () => {
    clearDatabase();

    // Setup test data directory
    testDataPath = `${PostyBirbDirectories.DATA_DIRECTORY}/legacy-db/${ts}/CustomShortcut-${v4()}`;

    // Copy test data to temp directory
    const testDataDir = join(testDataPath, 'data');
    ensureDirSync(testDataDir);

    const sourceFile = join(__dirname, '../test-files/data/custom-shortcut.db');
    const testFile = readFileSync(sourceFile);
    const destFile = join(testDataDir, 'custom-shortcut.db');

    writeSync(destFile, testFile);

    converter = new LegacyCustomShortcutConverter(testDataPath);
    repository = new PostyBirbDatabase('CustomShortcutSchema');
  });

  it('should import and convert legacy custom shortcut data', async () => {
    await converter.import();

    const records = await repository.findAll();
    expect(records).toHaveLength(2);

    // Verify first shortcut
    const shortcut1 = records.find(
      (r) => r.id === 'cs123456-1234-1234-1234-123456789abc',
    );
    expect(shortcut1).toBeDefined();
    expect(shortcut1!.name).toBe('myshortcut');

    // Verify BlockNote format - match against expected structure (ignoring dynamic id)
    expect(shortcut1!.shortcut).toMatchObject([
      {
        type: 'paragraph',
        props: {
          backgroundColor: 'default',
          textColor: 'default',
          textAlignment: 'left',
        },
        content: [
          {
            type: 'text',
            text: 'This is my custom shortcut content',
            styles: {},
          },
        ],
        children: [],
      },
    ]);

    // Verify second shortcut (dynamic with HTML)
    const shortcut2 = records.find(
      (r) => r.id === 'cs234567-2345-2345-2345-234567890bcd',
    );
    expect(shortcut2).toBeDefined();
    expect(shortcut2!.name).toBe('dynamicshortcut');

    // Verify HTML is converted to BlockNote blocks with bold formatting
    const textContent2 = JSON.stringify(shortcut2!.shortcut);
    expect(textContent2).toContain('Dynamic content');
    expect(textContent2).toContain('bold');
  });

  it('should handle custom shortcut with empty content', async () => {
    // Create test data with empty content
    const emptyContentData = {
      _id: 'test-empty-id',
      created: '2023-10-01T12:00:00Z',
      lastUpdated: '2023-10-01T12:00:00Z',
      shortcut: 'empty',
      content: '',
      isDynamic: false,
    };

    const testDataDir = join(testDataPath, 'data');
    const emptyFile = join(testDataDir, 'custom-shortcut.db');
    writeSync(emptyFile, Buffer.from(JSON.stringify(emptyContentData) + '\n'));

    await converter.import();

    const records = await repository.findAll();
    expect(records).toHaveLength(1);

    const record = records[0];
    expect(record.name).toBe('empty');

    // Empty content should create a single empty paragraph block
    expect(record.shortcut).toMatchObject([
      {
        type: 'paragraph',
        props: expect.any(Object),
        content: [],
        children: [],
      },
    ]);
  });

  it('should preserve shortcut name as the modern name field', async () => {
    await converter.import();

    const records = await repository.findAll();
    expect(records).toHaveLength(2);

    // All records should have name field matching legacy shortcut
    const names = records.map((r) => r.name);
    expect(names).toContain('myshortcut');
    expect(names).toContain('dynamicshortcut');
  });

  it('should convert legacy shortcuts in content to BlockNote format', async () => {
    // Create test data with legacy shortcut syntax
    const shortcutData = {
      _id: 'test-shortcuts-id',
      created: '2023-10-01T12:00:00Z',
      lastUpdated: '2023-10-01T12:00:00Z',
      shortcut: 'testshortcut',
      content:
        '<p>Hello {default} and {fa:myusername} with {customshortcut} text</p>',
      isDynamic: false,
    };

    const testDataDir = join(testDataPath, 'data');
    const shortcutFile = join(testDataDir, 'custom-shortcut.db');
    writeSync(shortcutFile, Buffer.from(JSON.stringify(shortcutData) + '\n'));

    await converter.import();

    const records = await repository.findAll();
    expect(records).toHaveLength(1);

    const record = records[0];
    expect(record.name).toBe('testshortcut');

    // Verify the structure - should have 2 blocks: defaultShortcut block + paragraph with content
    expect(record.shortcut).toHaveLength(2);

    // First block should be the defaultShortcut block
    expect(record.shortcut[0]).toMatchObject({
      type: 'defaultShortcut',
      props: {},
      content: [],
      children: [],
    });

    // Second block should be paragraph with username shortcut and customShortcut
    expect(record.shortcut[1]).toMatchObject({
      type: 'paragraph',
      props: expect.objectContaining({
        textColor: 'default',
        backgroundColor: 'default',
        textAlignment: 'left',
      }),
      content: [
        { type: 'text', text: 'Hello ', styles: {} },
        { type: 'text', text: ' and ', styles: {} },
        {
          type: 'username',
          props: expect.objectContaining({
            shortcut: 'furaffinity',
            only: '',
          }),
          content: [{ type: 'text', text: 'myusername', styles: {} }],
        },
        { type: 'text', text: ' with ', styles: {} },
        {
          type: 'customShortcut',
          props: { id: 'customshortcut' },
          content: [{ type: 'text', text: '', styles: {} }],
        },
        { type: 'text', text: ' text', styles: {} },
      ],
      children: [],
    });
  });

  it('should convert multiple username shortcuts to modern format', async () => {
    // Create test data with multiple username shortcuts
    const shortcutData = {
      _id: 'test-multi-username-id',
      created: '2023-10-01T12:00:00Z',
      lastUpdated: '2023-10-01T12:00:00Z',
      shortcut: 'multiusername',
      content:
        '<p>Follow me on {fa:furuser}, {tw:twitterhandle}, and {da:deviantartist}</p>',
      isDynamic: false,
    };

    const testDataDir = join(testDataPath, 'data');
    const shortcutFile = join(testDataDir, 'custom-shortcut.db');
    writeSync(shortcutFile, Buffer.from(JSON.stringify(shortcutData) + '\n'));

    await converter.import();

    const records = await repository.findAll();
    expect(records).toHaveLength(1);

    const record = records[0];

    // Verify the complete structure with all username shortcuts
    expect(record.shortcut).toMatchObject([
      {
        type: 'paragraph',
        props: expect.objectContaining({
          textColor: 'default',
          backgroundColor: 'default',
          textAlignment: 'left',
        }),
        content: [
          { type: 'text', text: 'Follow me on ', styles: {} },
          {
            type: 'username',
            props: expect.objectContaining({
              shortcut: 'furaffinity',
              only: '',
            }),
            content: [{ type: 'text', text: 'furuser', styles: {} }],
          },
          { type: 'text', text: ', ', styles: {} },
          {
            type: 'username',
            props: expect.objectContaining({
              shortcut: 'twitter',
              only: '',
            }),
            content: [{ type: 'text', text: 'twitterhandle', styles: {} }],
          },
          { type: 'text', text: ', and ', styles: {} },
          {
            type: 'username',
            props: expect.objectContaining({
              shortcut: 'deviantart',
              only: '',
            }),
            content: [{ type: 'text', text: 'deviantartist', styles: {} }],
          },
        ],
        children: [],
      },
    ]);
  });

  it('should convert {default} to block-level when alone in paragraph', async () => {
    const shortcutData = {
      _id: 'test-default-alone',
      created: '2023-10-01T12:00:00Z',
      lastUpdated: '2023-10-01T12:00:00Z',
      shortcut: 'defaultalone',
      content: '<p>{default}</p>',
      isDynamic: false,
    };

    const testDataDir = join(testDataPath, 'data');
    const shortcutFile = join(testDataDir, 'custom-shortcut.db');
    writeSync(shortcutFile, Buffer.from(JSON.stringify(shortcutData) + '\n'));

    await converter.import();

    const records = await repository.findAll();
    expect(records).toHaveLength(1);

    const record = records[0];

    // Should have a single defaultShortcut block
    expect(record.shortcut).toMatchObject([
      {
        type: 'defaultShortcut',
        props: {},
        content: [],
        children: [],
      },
    ]);
  });

  it('should insert defaultShortcut block before paragraph when {default} is with other content', async () => {
    const shortcutData = {
      _id: 'test-default-with-content',
      created: '2023-10-01T12:00:00Z',
      lastUpdated: '2023-10-01T12:00:00Z',
      shortcut: 'defaultwithcontent',
      content: '<p>Hello {default} World</p>',
      isDynamic: false,
    };

    const testDataDir = join(testDataPath, 'data');
    const shortcutFile = join(testDataDir, 'custom-shortcut.db');
    writeSync(shortcutFile, Buffer.from(JSON.stringify(shortcutData) + '\n'));

    await converter.import();

    const records = await repository.findAll();
    expect(records).toHaveLength(1);

    const record = records[0];

    // Should have 2 blocks: defaultShortcut block + paragraph with remaining text
    expect(record.shortcut).toMatchObject([
      {
        type: 'defaultShortcut',
        props: {},
        content: [],
        children: [],
      },
      {
        type: 'paragraph',
        props: expect.objectContaining({
          textColor: 'default',
          backgroundColor: 'default',
          textAlignment: 'left',
        }),
        content: [
          { type: 'text', text: 'Hello ', styles: {} },
          { type: 'text', text: ' World', styles: {} },
        ],
        children: [],
      },
    ]);
  });

  it('should handle multiple {default} tags correctly', async () => {
    const shortcutData = {
      _id: 'test-multiple-defaults',
      created: '2023-10-01T12:00:00Z',
      lastUpdated: '2023-10-01T12:00:00Z',
      shortcut: 'multipledefaults',
      content: '<p>{default}</p><p>Some text {default} here</p>',
      isDynamic: false,
    };

    const testDataDir = join(testDataPath, 'data');
    const shortcutFile = join(testDataDir, 'custom-shortcut.db');
    writeSync(shortcutFile, Buffer.from(JSON.stringify(shortcutData) + '\n'));

    await converter.import();

    const records = await repository.findAll();
    expect(records).toHaveLength(1);

    const record = records[0];

    // Should have 3 blocks: defaultShortcut (from first para), defaultShortcut (inserted), paragraph (remaining content)
    expect(record.shortcut).toMatchObject([
      {
        type: 'defaultShortcut',
        props: {},
        content: [],
        children: [],
      },
      {
        type: 'defaultShortcut',
        props: {},
        content: [],
        children: [],
      },
      {
        type: 'paragraph',
        props: expect.objectContaining({
          textColor: 'default',
          backgroundColor: 'default',
          textAlignment: 'left',
        }),
        content: [
          { type: 'text', text: 'Some text ', styles: {} },
          { type: 'text', text: ' here', styles: {} },
        ],
        children: [],
      },
    ]);
  });

  it('should handle and strip modifier blocks from shortcuts', async () => {
    const shortcutData = {
      _id: 'test-modifiers',
      created: '2023-10-01T12:00:00Z',
      lastUpdated: '2023-10-01T12:00:00Z',
      shortcut: 'modifiertest',
      content:
        '<p>Test {fa[only=furaffinity]:testuser} and {customshortcut[modifier]} text</p>',
      isDynamic: false,
    };

    const testDataDir = join(testDataPath, 'data');
    const shortcutFile = join(testDataDir, 'custom-shortcut.db');
    writeSync(shortcutFile, Buffer.from(JSON.stringify(shortcutData) + '\n'));

    await converter.import();

    const records = await repository.findAll();
    expect(records).toHaveLength(1);

    const record = records[0];

    // Verify the structure - modifiers should be stripped
    expect(record.shortcut).toMatchObject([
      {
        type: 'paragraph',
        props: expect.objectContaining({
          textColor: 'default',
          backgroundColor: 'default',
          textAlignment: 'left',
        }),
        content: [
          { type: 'text', text: 'Test ', styles: {} },
          {
            type: 'username',
            props: expect.objectContaining({
              shortcut: 'furaffinity',
              only: '',
            }),
            content: [{ type: 'text', text: 'testuser', styles: {} }],
          },
          { type: 'text', text: ' and ', styles: {} },
          {
            type: 'customShortcut',
            props: { id: 'customshortcut' },
            content: [{ type: 'text', text: '', styles: {} }],
          },
          { type: 'text', text: ' text', styles: {} },
        ],
        children: [],
      },
    ]);
  });
});
