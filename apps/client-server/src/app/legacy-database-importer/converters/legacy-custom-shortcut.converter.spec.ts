import { clearDatabase } from '@postybirb/database';
import { ensureDirSync, PostyBirbDirectories, writeSync } from '@postybirb/fs';
import { readFileSync } from 'fs';
import { join } from 'path';
import { v4 } from 'uuid';
import { PostyBirbDatabase } from '../../drizzle/postybirb-database/postybirb-database';
import { LegacyCustomShortcut } from '../legacy-entities/legacy-custom-shortcut';
import { LegacyCustomShortcutConverter } from './legacy-custom-shortcut.converter';

describe('LegacyCustomShortcutConverter', () => {
  let converter: LegacyCustomShortcutConverter;
  let testDataPath: string;
  let repository: PostyBirbDatabase<'CustomShortcutSchema'>;
  const ts = Date.now();

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

  it('should be defined', () => {
    expect(LegacyCustomShortcutConverter).toBeDefined();
  });

  describe('System Shortcuts Conversion', () => {
    it('should convert {title} to titleShortcut', async () => {
      const legacyShortcut = new LegacyCustomShortcut({
        _id: 'test-title-shortcut',
        created: '2023-10-01T12:00:00Z',
        lastUpdated: '2023-10-01T12:00:00Z',
        shortcut: 'titletest',
        content: '<p>Artwork: {title}</p>',
        isDynamic: false,
      });

      const result = await legacyShortcut.convert();

      expect(result.shortcut).toMatchObject({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Artwork: ' },
              { type: 'titleShortcut', attrs: {} },
            ],
          },
        ],
      });
    });

    it('should convert {tags} to tagsShortcut', async () => {
      const legacyShortcut = new LegacyCustomShortcut({
        _id: 'test-tags-shortcut',
        created: '2023-10-01T12:00:00Z',
        lastUpdated: '2023-10-01T12:00:00Z',
        shortcut: 'tagstest',
        content: '<p>Tags: {tags}</p>',
        isDynamic: false,
      });

      const result = await legacyShortcut.convert();

      expect(result.shortcut).toMatchObject({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Tags: ' },
              { type: 'tagsShortcut', attrs: {} },
            ],
          },
        ],
      });
    });

    it('should convert {cw} to contentWarningShortcut', async () => {
      const legacyShortcut = new LegacyCustomShortcut({
        _id: 'test-cw-shortcut',
        created: '2023-10-01T12:00:00Z',
        lastUpdated: '2023-10-01T12:00:00Z',
        shortcut: 'cwtest',
        content: '<p>Content Warning: {cw}</p>',
        isDynamic: false,
      });

      const result = await legacyShortcut.convert();

      expect(result.shortcut).toMatchObject({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Content Warning: ' },
              { type: 'contentWarningShortcut', attrs: {} },
            ],
          },
        ],
      });
    });

    it('should convert multiple system shortcuts in a single block', async () => {
      const legacyShortcut = new LegacyCustomShortcut({
        _id: 'test-multi-system',
        created: '2023-10-01T12:00:00Z',
        lastUpdated: '2023-10-01T12:00:00Z',
        shortcut: 'multisystem',
        content: '<p>{title} ({cw})</p><p>{tags}</p>',
        isDynamic: false,
      });

      const result = await legacyShortcut.convert();

      expect(result.shortcut).toMatchObject({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'titleShortcut', attrs: {} },
              { type: 'text', text: ' (' },
              { type: 'contentWarningShortcut', attrs: {} },
              { type: 'text', text: ')' },
            ],
          },
          {
            type: 'paragraph',
            content: [{ type: 'tagsShortcut', attrs: {} }],
          },
        ],
      });
    });

    it('should convert system shortcuts alongside username shortcuts', async () => {
      const legacyShortcut = new LegacyCustomShortcut({
        _id: 'test-mixed-shortcuts',
        created: '2023-10-01T12:00:00Z',
        lastUpdated: '2023-10-01T12:00:00Z',
        shortcut: 'mixedtest',
        content: '<p>{title} by {fa:myusername}</p><p>{cw}</p><p>{tags}</p>',
        isDynamic: false,
      });

      const result = await legacyShortcut.convert();

      expect(result.shortcut).toMatchObject({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'titleShortcut', attrs: {} },
              { type: 'text', text: ' by ' },
              {
                type: 'username',
                attrs: expect.objectContaining({
                  shortcut: 'furaffinity',
                  only: '',
                  username: 'myusername',
                }),
              },
            ],
          },
          {
            type: 'paragraph',
            content: [{ type: 'contentWarningShortcut', attrs: {} }],
          },
          {
            type: 'paragraph',
            content: [{ type: 'tagsShortcut', attrs: {} }],
          },
        ],
      });
    });

    it('should handle case-insensitive system shortcuts', async () => {
      const legacyShortcut = new LegacyCustomShortcut({
        _id: 'test-case-insensitive',
        created: '2023-10-01T12:00:00Z',
        lastUpdated: '2023-10-01T12:00:00Z',
        shortcut: 'casetest',
        content: '<p>{TITLE} {CW} {TAGS}</p>',
        isDynamic: false,
      });

      const result = await legacyShortcut.convert();

      expect(result.shortcut).toMatchObject({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'titleShortcut', attrs: {} },
              { type: 'text', text: ' ' },
              { type: 'contentWarningShortcut', attrs: {} },
              { type: 'text', text: ' ' },
              { type: 'tagsShortcut', attrs: {} },
            ],
          },
        ],
      });
    });
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

    // Verify TipTap format
    expect(shortcut1!.shortcut).toMatchObject({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'This is my custom shortcut content',
            },
          ],
        },
      ],
    });

    // Verify second shortcut (dynamic with HTML)
    const shortcut2 = records.find(
      (r) => r.id === 'cs234567-2345-2345-2345-234567890bcd',
    );
    expect(shortcut2).toBeDefined();
    expect(shortcut2!.name).toBe('dynamicshortcut');

    // Verify HTML is converted to TipTap format with bold formatting
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

    // Empty content should create a doc with a single empty paragraph
    expect(record.shortcut).toMatchObject({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
        },
      ],
    });
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

  it('should convert legacy shortcuts in content to TipTap format', async () => {
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

    const blocks = (record.shortcut as any).content;

    // Should have 2 blocks: defaultShortcut block + paragraph with content
    expect(blocks).toHaveLength(2);

    // First block should be the defaultShortcut block
    expect(blocks[0]).toMatchObject({
      type: 'defaultShortcut',
      attrs: {},
    });

    // Second block should be paragraph with username shortcut and customShortcut
    expect(blocks[1]).toMatchObject({
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Hello ' },
        { type: 'text', text: ' and ' },
        {
          type: 'username',
          attrs: expect.objectContaining({
            shortcut: 'furaffinity',
            only: '',
            username: 'myusername',
          }),
        },
        { type: 'text', text: ' with ' },
        {
          type: 'customShortcut',
          attrs: { id: 'customshortcut' },
          content: [{ type: 'text', text: '' }],
        },
        { type: 'text', text: ' text' },
      ],
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
    expect(record.shortcut).toMatchObject({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Follow me on ' },
            {
              type: 'username',
              attrs: expect.objectContaining({
                shortcut: 'furaffinity',
                only: '',
                username: 'furuser',
              }),
            },
            { type: 'text', text: ', ' },
            {
              type: 'username',
              attrs: expect.objectContaining({
                shortcut: 'twitter',
                only: '',
                username: 'twitterhandle',
              }),
            },
            { type: 'text', text: ', and ' },
            {
              type: 'username',
              attrs: expect.objectContaining({
                shortcut: 'deviantart',
                only: '',
                username: 'deviantartist',
              }),
            },
          ],
        },
      ],
    });
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
    expect(record.shortcut).toMatchObject({
      type: 'doc',
      content: [
        {
          type: 'defaultShortcut',
          attrs: {},
        },
      ],
    });
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
    expect(record.shortcut).toMatchObject({
      type: 'doc',
      content: [
        {
          type: 'defaultShortcut',
          attrs: {},
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Hello ' },
            { type: 'text', text: ' World' },
          ],
        },
      ],
    });
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
    expect(record.shortcut).toMatchObject({
      type: 'doc',
      content: [
        {
          type: 'defaultShortcut',
          attrs: {},
        },
        {
          type: 'defaultShortcut',
          attrs: {},
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Some text ' },
            { type: 'text', text: ' here' },
          ],
        },
      ],
    });
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
    expect(record.shortcut).toMatchObject({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Test ' },
            {
              type: 'username',
              attrs: expect.objectContaining({
                shortcut: 'furaffinity',
                only: '',
                username: 'testuser',
              }),
            },
            { type: 'text', text: ' and ' },
            {
              type: 'customShortcut',
              attrs: { id: 'customshortcut' },
              content: [{ type: 'text', text: '' }],
            },
            { type: 'text', text: ' text' },
          ],
        },
      ],
    });
  });
});
