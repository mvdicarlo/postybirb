import { PostyBirbDatabase } from '../../drizzle/postybirb-database/postybirb-database';
import { LegacyCustomShortcutConverter } from './legacy-custom-shortcut.converter';

describe('LegacyCustomShortcutConverter', () => {
  let converter: LegacyCustomShortcutConverter;
  let testDataPath: string;
  let repository: PostyBirbDatabase<'CustomShortcutSchema'>;
  const ts = Date.now();

  //   beforeEach(async () => {
  //     clearDatabase();

  //     // Setup test data directory
  //     testDataPath = `${PostyBirbDirectories.DATA_DIRECTORY}/legacy-db/${ts}/CustomShortcut-${v4()}`;

  //     // Copy test data to temp directory
  //     const testDataDir = join(testDataPath, 'data');
  //     ensureDirSync(testDataDir);

  //     const sourceFile = join(__dirname, '../test-files/data/custom-shortcut.db');
  //     const testFile = readFileSync(sourceFile);
  //     const destFile = join(testDataDir, 'custom-shortcut.db');

  //     writeSync(destFile, testFile);

  //     converter = new LegacyCustomShortcutConverter(testDataPath);
  //     repository = new PostyBirbDatabase('CustomShortcutSchema');
  //   });

  it('should be defined', () => {
    expect(LegacyCustomShortcutConverter).toBeDefined();
  });

  //   it('should import and convert legacy custom shortcut data', async () => {
  //     await converter.import();

  //     const records = await repository.findAll();
  //     expect(records).toHaveLength(2);

  //     // Verify first shortcut
  //     const shortcut1 = records.find(
  //       (r) => r.id === 'cs123456-1234-1234-1234-123456789abc',
  //     );
  //     expect(shortcut1).toBeDefined();
  //     expect(shortcut1!.name).toBe('myshortcut');

  //     // Verify BlockNote format - match against expected structure (ignoring dynamic id)
  //     expect(shortcut1!.shortcut).toMatchObject([
  //       {
  //         type: 'paragraph',
  //         props: {
  //           backgroundColor: 'default',
  //           textColor: 'default',
  //           textAlignment: 'left',
  //         },
  //         content: [
  //           {
  //             type: 'text',
  //             text: 'This is my custom shortcut content',
  //             styles: {},
  //           },
  //         ],
  //         children: [],
  //       },
  //     ]);

  //     // Verify second shortcut (dynamic with HTML)
  //     const shortcut2 = records.find(
  //       (r) => r.id === 'cs234567-2345-2345-2345-234567890bcd',
  //     );
  //     expect(shortcut2).toBeDefined();
  //     expect(shortcut2!.name).toBe('dynamicshortcut');

  //     // Verify HTML is converted to BlockNote blocks with bold formatting
  //     const textContent2 = JSON.stringify(shortcut2!.shortcut);
  //     expect(textContent2).toContain('Dynamic content');
  //     expect(textContent2).toContain('bold');
  //   });

  //   it('should handle custom shortcut with empty content', async () => {
  //     // Create test data with empty content
  //     const emptyContentData = {
  //       _id: 'test-empty-id',
  //       created: '2023-10-01T12:00:00Z',
  //       lastUpdated: '2023-10-01T12:00:00Z',
  //       shortcut: 'empty',
  //       content: '',
  //       isDynamic: false,
  //     };

  //     const testDataDir = join(testDataPath, 'data');
  //     const emptyFile = join(testDataDir, 'custom-shortcut.db');
  //     writeSync(emptyFile, Buffer.from(JSON.stringify(emptyContentData) + '\n'));

  //     await converter.import();

  //     const records = await repository.findAll();
  //     expect(records).toHaveLength(1);

  //     const record = records[0];
  //     expect(record.name).toBe('empty');

  //     // Empty content should create a single empty paragraph block
  //     expect(record.shortcut).toMatchObject([
  //       {
  //         type: 'paragraph',
  //         props: expect.any(Object),
  //         content: [],
  //         children: [],
  //       },
  //     ]);
  //   });

  //   it('should preserve shortcut name as the modern name field', async () => {
  //     await converter.import();

  //     const records = await repository.findAll();
  //     expect(records).toHaveLength(2);

  //     // All records should have name field matching legacy shortcut
  //     const names = records.map((r) => r.name);
  //     expect(names).toContain('myshortcut');
  //     expect(names).toContain('dynamicshortcut');
  //   });

  //   it('should convert legacy shortcuts in content to BlockNote format', async () => {
  //     // Create test data with legacy shortcut syntax
  //     const shortcutData = {
  //       _id: 'test-shortcuts-id',
  //       created: '2023-10-01T12:00:00Z',
  //       lastUpdated: '2023-10-01T12:00:00Z',
  //       shortcut: 'testshortcut',
  //       content:
  //         '<p>Hello {default} and {fa:myusername} with {customshortcut} text</p>',
  //       isDynamic: false,
  //     };

  //     const testDataDir = join(testDataPath, 'data');
  //     const shortcutFile = join(testDataDir, 'custom-shortcut.db');
  //     writeSync(shortcutFile, Buffer.from(JSON.stringify(shortcutData) + '\n'));

  //     await converter.import();

  //     const records = await repository.findAll();
  //     expect(records).toHaveLength(1);

  //     const record = records[0];
  //     expect(record.name).toBe('testshortcut');

  //     // Verify the structure - should have 2 blocks: defaultShortcut block + paragraph with content
  //     expect(record.shortcut).toHaveLength(2);

  //     // First block should be the defaultShortcut block
  //     expect(record.shortcut[0]).toMatchObject({
  //       type: 'defaultShortcut',
  //       props: {},
  //       content: [],
  //       children: [],
  //     });

  //     // Second block should be paragraph with username shortcut and customShortcut
  //     expect(record.shortcut[1]).toMatchObject({
  //       type: 'paragraph',
  //       props: expect.objectContaining({
  //         textColor: 'default',
  //         backgroundColor: 'default',
  //         textAlignment: 'left',
  //       }),
  //       content: [
  //         { type: 'text', text: 'Hello ', styles: {} },
  //         { type: 'text', text: ' and ', styles: {} },
  //         {
  //           type: 'username',
  //           props: expect.objectContaining({
  //             shortcut: 'furaffinity',
  //             only: '',
  //           }),
  //           content: [{ type: 'text', text: 'myusername', styles: {} }],
  //         },
  //         { type: 'text', text: ' with ', styles: {} },
  //         {
  //           type: 'customShortcut',
  //           props: { id: 'customshortcut' },
  //           content: [{ type: 'text', text: '', styles: {} }],
  //         },
  //         { type: 'text', text: ' text', styles: {} },
  //       ],
  //       children: [],
  //     });
  //   });

  //   it('should convert multiple username shortcuts to modern format', async () => {
  //     // Create test data with multiple username shortcuts
  //     const shortcutData = {
  //       _id: 'test-multi-username-id',
  //       created: '2023-10-01T12:00:00Z',
  //       lastUpdated: '2023-10-01T12:00:00Z',
  //       shortcut: 'multiusername',
  //       content:
  //         '<p>Follow me on {fa:furuser}, {tw:twitterhandle}, and {da:deviantartist}</p>',
  //       isDynamic: false,
  //     };

  //     const testDataDir = join(testDataPath, 'data');
  //     const shortcutFile = join(testDataDir, 'custom-shortcut.db');
  //     writeSync(shortcutFile, Buffer.from(JSON.stringify(shortcutData) + '\n'));

  //     await converter.import();

  //     const records = await repository.findAll();
  //     expect(records).toHaveLength(1);

  //     const record = records[0];

  //     // Verify the complete structure with all username shortcuts
  //     expect(record.shortcut).toMatchObject([
  //       {
  //         type: 'paragraph',
  //         props: expect.objectContaining({
  //           textColor: 'default',
  //           backgroundColor: 'default',
  //           textAlignment: 'left',
  //         }),
  //         content: [
  //           { type: 'text', text: 'Follow me on ', styles: {} },
  //           {
  //             type: 'username',
  //             props: expect.objectContaining({
  //               shortcut: 'furaffinity',
  //               only: '',
  //             }),
  //             content: [{ type: 'text', text: 'furuser', styles: {} }],
  //           },
  //           { type: 'text', text: ', ', styles: {} },
  //           {
  //             type: 'username',
  //             props: expect.objectContaining({
  //               shortcut: 'twitter',
  //               only: '',
  //             }),
  //             content: [{ type: 'text', text: 'twitterhandle', styles: {} }],
  //           },
  //           { type: 'text', text: ', and ', styles: {} },
  //           {
  //             type: 'username',
  //             props: expect.objectContaining({
  //               shortcut: 'deviantart',
  //               only: '',
  //             }),
  //             content: [{ type: 'text', text: 'deviantartist', styles: {} }],
  //           },
  //         ],
  //         children: [],
  //       },
  //     ]);
  //   });

  //   it('should convert {default} to block-level when alone in paragraph', async () => {
  //     const shortcutData = {
  //       _id: 'test-default-alone',
  //       created: '2023-10-01T12:00:00Z',
  //       lastUpdated: '2023-10-01T12:00:00Z',
  //       shortcut: 'defaultalone',
  //       content: '<p>{default}</p>',
  //       isDynamic: false,
  //     };

  //     const testDataDir = join(testDataPath, 'data');
  //     const shortcutFile = join(testDataDir, 'custom-shortcut.db');
  //     writeSync(shortcutFile, Buffer.from(JSON.stringify(shortcutData) + '\n'));

  //     await converter.import();

  //     const records = await repository.findAll();
  //     expect(records).toHaveLength(1);

  //     const record = records[0];

  //     // Should have a single defaultShortcut block
  //     expect(record.shortcut).toMatchObject([
  //       {
  //         type: 'defaultShortcut',
  //         props: {},
  //         content: [],
  //         children: [],
  //       },
  //     ]);
  //   });

  //   it('should insert defaultShortcut block before paragraph when {default} is with other content', async () => {
  //     const shortcutData = {
  //       _id: 'test-default-with-content',
  //       created: '2023-10-01T12:00:00Z',
  //       lastUpdated: '2023-10-01T12:00:00Z',
  //       shortcut: 'defaultwithcontent',
  //       content: '<p>Hello {default} World</p>',
  //       isDynamic: false,
  //     };

  //     const testDataDir = join(testDataPath, 'data');
  //     const shortcutFile = join(testDataDir, 'custom-shortcut.db');
  //     writeSync(shortcutFile, Buffer.from(JSON.stringify(shortcutData) + '\n'));

  //     await converter.import();

  //     const records = await repository.findAll();
  //     expect(records).toHaveLength(1);

  //     const record = records[0];

  //     // Should have 2 blocks: defaultShortcut block + paragraph with remaining text
  //     expect(record.shortcut).toMatchObject([
  //       {
  //         type: 'defaultShortcut',
  //         props: {},
  //         content: [],
  //         children: [],
  //       },
  //       {
  //         type: 'paragraph',
  //         props: expect.objectContaining({
  //           textColor: 'default',
  //           backgroundColor: 'default',
  //           textAlignment: 'left',
  //         }),
  //         content: [
  //           { type: 'text', text: 'Hello ', styles: {} },
  //           { type: 'text', text: ' World', styles: {} },
  //         ],
  //         children: [],
  //       },
  //     ]);
  //   });

  //   it('should handle multiple {default} tags correctly', async () => {
  //     const shortcutData = {
  //       _id: 'test-multiple-defaults',
  //       created: '2023-10-01T12:00:00Z',
  //       lastUpdated: '2023-10-01T12:00:00Z',
  //       shortcut: 'multipledefaults',
  //       content: '<p>{default}</p><p>Some text {default} here</p>',
  //       isDynamic: false,
  //     };

  //     const testDataDir = join(testDataPath, 'data');
  //     const shortcutFile = join(testDataDir, 'custom-shortcut.db');
  //     writeSync(shortcutFile, Buffer.from(JSON.stringify(shortcutData) + '\n'));

  //     await converter.import();

  //     const records = await repository.findAll();
  //     expect(records).toHaveLength(1);

  //     const record = records[0];

  //     // Should have 3 blocks: defaultShortcut (from first para), defaultShortcut (inserted), paragraph (remaining content)
  //     expect(record.shortcut).toMatchObject([
  //       {
  //         type: 'defaultShortcut',
  //         props: {},
  //         content: [],
  //         children: [],
  //       },
  //       {
  //         type: 'defaultShortcut',
  //         props: {},
  //         content: [],
  //         children: [],
  //       },
  //       {
  //         type: 'paragraph',
  //         props: expect.objectContaining({
  //           textColor: 'default',
  //           backgroundColor: 'default',
  //           textAlignment: 'left',
  //         }),
  //         content: [
  //           { type: 'text', text: 'Some text ', styles: {} },
  //           { type: 'text', text: ' here', styles: {} },
  //         ],
  //         children: [],
  //       },
  //     ]);
  //   });

  //   it('should handle and strip modifier blocks from shortcuts', async () => {
  //     const shortcutData = {
  //       _id: 'test-modifiers',
  //       created: '2023-10-01T12:00:00Z',
  //       lastUpdated: '2023-10-01T12:00:00Z',
  //       shortcut: 'modifiertest',
  //       content:
  //         '<p>Test {fa[only=furaffinity]:testuser} and {customshortcut[modifier]} text</p>',
  //       isDynamic: false,
  //     };

  //     const testDataDir = join(testDataPath, 'data');
  //     const shortcutFile = join(testDataDir, 'custom-shortcut.db');
  //     writeSync(shortcutFile, Buffer.from(JSON.stringify(shortcutData) + '\n'));

  //     await converter.import();

  //     const records = await repository.findAll();
  //     expect(records).toHaveLength(1);

  //     const record = records[0];

  //     // Verify the structure - modifiers should be stripped
  //     expect(record.shortcut).toMatchObject([
  //       {
  //         type: 'paragraph',
  //         props: expect.objectContaining({
  //           textColor: 'default',
  //           backgroundColor: 'default',
  //           textAlignment: 'left',
  //         }),
  //         content: [
  //           { type: 'text', text: 'Test ', styles: {} },
  //           {
  //             type: 'username',
  //             props: expect.objectContaining({
  //               shortcut: 'furaffinity',
  //               only: '',
  //             }),
  //             content: [{ type: 'text', text: 'testuser', styles: {} }],
  //           },
  //           { type: 'text', text: ' and ', styles: {} },
  //           {
  //             type: 'customShortcut',
  //             props: { id: 'customshortcut' },
  //             content: [{ type: 'text', text: '', styles: {} }],
  //           },
  //           { type: 'text', text: ' text', styles: {} },
  //         ],
  //         children: [],
  //       },
  //     ]);
  //   });
});

describe('LegacyCustomShortcut unit tests', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { LegacyCustomShortcut } = require('../legacy-entities/legacy-custom-shortcut');

  it('should convert {title} alone in a paragraph to titleShortcut block', async () => {
    const legacy = new LegacyCustomShortcut({
      _id: 'test-title-alone',
      created: '2023-10-01T12:00:00Z',
      lastUpdated: '2023-10-01T12:00:00Z',
      shortcut: 'titlealone',
      content: '<p>{title}</p>',
      isDynamic: false,
    });

    const result = await legacy.convert();

    // Should have a single titleShortcut block
    expect(result.shortcut).toMatchObject([
      {
        type: 'titleShortcut',
        props: {},
        content: undefined,
        children: [],
      },
    ]);
  });

  it('should convert {tags} alone in a paragraph to tagsShortcut block', async () => {
    const legacy = new LegacyCustomShortcut({
      _id: 'test-tags-alone',
      created: '2023-10-01T12:00:00Z',
      lastUpdated: '2023-10-01T12:00:00Z',
      shortcut: 'tagsalone',
      content: '<p>{tags}</p>',
      isDynamic: false,
    });

    const result = await legacy.convert();

    // Should have a single tagsShortcut block
    expect(result.shortcut).toMatchObject([
      {
        type: 'tagsShortcut',
        props: {},
        content: undefined,
        children: [],
      },
    ]);
  });

  it('should insert titleShortcut block before paragraph when {title} is with other content', async () => {
    const legacy = new LegacyCustomShortcut({
      _id: 'test-title-with-content',
      created: '2023-10-01T12:00:00Z',
      lastUpdated: '2023-10-01T12:00:00Z',
      shortcut: 'titlewithcontent',
      content: '<p>Hello {title} World</p>',
      isDynamic: false,
    });

    const result = await legacy.convert();

    // Should have 2 blocks: titleShortcut block + paragraph with remaining text
    expect(result.shortcut).toHaveLength(2);
    expect(result.shortcut[0]).toMatchObject({
      type: 'titleShortcut',
      props: {},
      content: undefined,
      children: [],
    });
    expect(result.shortcut[1]).toMatchObject({
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
    });
  });

  it('should insert tagsShortcut block before paragraph when {tags} is with other content', async () => {
    const legacy = new LegacyCustomShortcut({
      _id: 'test-tags-with-content',
      created: '2023-10-01T12:00:00Z',
      lastUpdated: '2023-10-01T12:00:00Z',
      shortcut: 'tagswithcontent',
      content: '<p>See my {tags} here</p>',
      isDynamic: false,
    });

    const result = await legacy.convert();

    // Should have 2 blocks: tagsShortcut block + paragraph with remaining text
    expect(result.shortcut).toHaveLength(2);
    expect(result.shortcut[0]).toMatchObject({
      type: 'tagsShortcut',
      props: {},
      content: undefined,
      children: [],
    });
    expect(result.shortcut[1]).toMatchObject({
      type: 'paragraph',
      props: expect.objectContaining({
        textColor: 'default',
        backgroundColor: 'default',
        textAlignment: 'left',
      }),
      content: [
        { type: 'text', text: 'See my ', styles: {} },
        { type: 'text', text: ' here', styles: {} },
      ],
      children: [],
    });
  });

  it('should handle both {title} and {tags} in the same content', async () => {
    const legacy = new LegacyCustomShortcut({
      _id: 'test-title-and-tags',
      created: '2023-10-01T12:00:00Z',
      lastUpdated: '2023-10-01T12:00:00Z',
      shortcut: 'titleandtags',
      content: '<p>{title}</p><p>{tags}</p>',
      isDynamic: false,
    });

    const result = await legacy.convert();

    // Should have 2 blocks: titleShortcut + tagsShortcut
    expect(result.shortcut).toHaveLength(2);
    expect(result.shortcut[0]).toMatchObject({
      type: 'titleShortcut',
      props: {},
      content: undefined,
    });
    expect(result.shortcut[1]).toMatchObject({
      type: 'tagsShortcut',
      props: {},
      content: undefined,
    });
  });

  it('should handle {title}, {tags}, and {default} together', async () => {
    const legacy = new LegacyCustomShortcut({
      _id: 'test-all-shortcuts',
      created: '2023-10-01T12:00:00Z',
      lastUpdated: '2023-10-01T12:00:00Z',
      shortcut: 'allshortcuts',
      content: '<p>{title}</p><p>{default}</p><p>{tags}</p>',
      isDynamic: false,
    });

    const result = await legacy.convert();

    // Should have 3 blocks: titleShortcut + defaultShortcut + tagsShortcut
    expect(result.shortcut).toHaveLength(3);
    expect(result.shortcut[0]).toMatchObject({
      type: 'titleShortcut',
      props: {},
      content: undefined,
    });
    expect(result.shortcut[1]).toMatchObject({
      type: 'defaultShortcut',
      props: {},
      content: [],
    });
    expect(result.shortcut[2]).toMatchObject({
      type: 'tagsShortcut',
      props: {},
      content: undefined,
    });
  });

  it('should handle {title} with {default} and text content', async () => {
    const legacy = new LegacyCustomShortcut({
      _id: 'test-mixed-content',
      created: '2023-10-01T12:00:00Z',
      lastUpdated: '2023-10-01T12:00:00Z',
      shortcut: 'mixedcontent',
      content: '<p>{title}</p><p>{default}</p><p>Some footer text with {tags}</p>',
      isDynamic: false,
    });

    const result = await legacy.convert();

    // Should have 4 blocks: titleShortcut + defaultShortcut + tagsShortcut + paragraph
    expect(result.shortcut).toHaveLength(4);
    expect(result.shortcut[0]).toMatchObject({
      type: 'titleShortcut',
      props: {},
    });
    expect(result.shortcut[1]).toMatchObject({
      type: 'defaultShortcut',
      props: {},
    });
    expect(result.shortcut[2]).toMatchObject({
      type: 'tagsShortcut',
      props: {},
    });
    expect(result.shortcut[3]).toMatchObject({
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Some footer text with ', styles: {} },
      ],
    });
  });

  it('should preserve id and name in converted result', async () => {
    const legacy = new LegacyCustomShortcut({
      _id: 'unique-id-123',
      created: '2023-10-01T12:00:00Z',
      lastUpdated: '2023-10-01T12:00:00Z',
      shortcut: 'myshortcutname',
      content: '<p>{title}</p>',
      isDynamic: false,
    });

    const result = await legacy.convert();

    expect(result.id).toBe('unique-id-123');
    expect(result.name).toBe('myshortcutname');
  });
});
