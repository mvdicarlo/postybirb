/* eslint-disable max-classes-per-file */
import { Test, TestingModule } from '@nestjs/testing';
import { clearDatabase } from '@postybirb/database';
import { DescriptionField } from '@postybirb/form-builder';
import {
  Description,
  DescriptionType,
  DescriptionValue,
  IWebsiteOptions,
} from '@postybirb/types';
import { WEBSITE_IMPLEMENTATIONS } from '../../constants';
import { CustomShortcutsService } from '../../custom-shortcuts/custom-shortcuts.service';
import { SettingsService } from '../../settings/settings.service';
import { UserConvertersService } from '../../user-converters/user-converters.service';
import { BaseWebsiteOptions } from '../../websites/models/base-website-options';
import { DefaultWebsiteOptions } from '../../websites/models/default-website-options';
import { UnknownWebsite } from '../../websites/website';
import { IDescriptionBlockNode } from '../models/description-node/description-node.types';
import { DescriptionParserService } from './description-parser.service';

describe('DescriptionParserService', () => {
  let module: TestingModule;
  let service: DescriptionParserService;
  let settingsService: SettingsService;
  let customShortcutsService: CustomShortcutsService;
  let userConvertersService: UserConvertersService;
  const testDescription: Description = [
    {
      id: 'test-basic-text',
      type: 'paragraph',
      props: {
        textColor: 'default',
        backgroundColor: 'default',
        textAlignment: 'left',
      },
      content: [
        { type: 'text', text: 'Hello, ', styles: { bold: true } },
        { type: 'text', text: 'World!', styles: {} },
      ],
      children: [],
    },
    {
      id: 'testlink',
      type: 'paragraph',
      props: {
        textColor: 'default',
        backgroundColor: 'default',
        textAlignment: 'left',
      },
      content: [
        {
          type: 'link',
          href: 'https://postybirb.com',
          content: [{ type: 'text', text: 'A link', styles: {} }],
        },
      ],
      children: [],
    },
  ];

  beforeEach(async () => {
    clearDatabase();
    module = await Test.createTestingModule({
      providers: [
        DescriptionParserService,
        {
          provide: SettingsService,
          useValue: {
            getSettings: jest.fn(),
            getDefaultSettings: jest.fn(),
          },
        },
        {
          provide: CustomShortcutsService,
          useValue: {
            findById: jest.fn(),
          },
        },
        {
          provide: UserConvertersService,
          useValue: {
            convert: jest
              .fn()
              .mockImplementation((instance, username) =>
                Promise.resolve(username),
              ),
          },
        },
        {
          provide: WEBSITE_IMPLEMENTATIONS,
          useValue: [],
        },
      ],
    }).compile();
    service = module.get(DescriptionParserService);
    settingsService = module.get(SettingsService);
    customShortcutsService = module.get(CustomShortcutsService);
    userConvertersService = module.get(UserConvertersService);
    settingsService.getDefaultSettings = jest.fn().mockResolvedValue({
      settings: {
        hiddenWebsites: [],
        language: 'en',
        allowAd: false,
      },
    });
  });

  afterAll(async () => {
    await module.close();
  });

  function createWebsiteOptions(
    description: Description | undefined,
  ): IWebsiteOptions {
    return {
      data: {
        description: {
          description,
        },
      },
    } as IWebsiteOptions;
  }

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should parse plaintext description', async () => {
    const instance = {
      decoratedProps: {
        allowAd: true,
        metadata: {
          name: 'Test',
        },
      },
    };

    class PlaintextBaseWebsiteOptions extends BaseWebsiteOptions {
      @DescriptionField({ descriptionType: DescriptionType.PLAINTEXT })
      description: DescriptionValue;
    }

    const defaultOptions = createWebsiteOptions(testDescription);
    const websiteOptions = createWebsiteOptions(undefined);
    const description = await service.parse(
      instance as unknown as UnknownWebsite,
      new DefaultWebsiteOptions(defaultOptions.data),
      new PlaintextBaseWebsiteOptions(websiteOptions.data),
      [],
      '',
    );
    expect(description).toMatchInlineSnapshot(`
      "Hello, World!
      A link: https://postybirb.com"
    `);
  });

  it('should parse html description', async () => {
    const instance = {
      decoratedProps: {
        allowAd: true,
        metadata: {
          name: 'Test',
        },
      },
    };

    const defaultOptions = createWebsiteOptions(testDescription);
    const websiteOptions = createWebsiteOptions(undefined);
    const description = await service.parse(
      instance as unknown as UnknownWebsite,
      new DefaultWebsiteOptions(defaultOptions.data),
      new BaseWebsiteOptions(websiteOptions.data),
      [],
      '',
    );
    expect(description).toMatchInlineSnapshot(
      `"<div><span><b>Hello, </b></span>World!<br><a target="_blank" href="https://postybirb.com">A link</a></div>"`,
    );
  });

  it('should parse markdown description', async () => {
    const instance = {
      decoratedProps: {
        allowAd: true,
        metadata: {
          name: 'Test',
        },
      },
    };

    class MarkdownBaseWebsiteOptions extends BaseWebsiteOptions {
      @DescriptionField({ descriptionType: DescriptionType.MARKDOWN })
      description: DescriptionValue;
    }

    const defaultOptions = createWebsiteOptions(testDescription);
    const websiteOptions = createWebsiteOptions(undefined);
    const description = await service.parse(
      instance as unknown as UnknownWebsite,
      new DefaultWebsiteOptions(defaultOptions.data),
      new MarkdownBaseWebsiteOptions(websiteOptions.data),
      [],
      '',
    );
    expect(description).toMatchInlineSnapshot(`
      "**Hello,** World!  
      [A link](https://postybirb.com)"
    `);
  });

  it('should return empty for description type NONE', async () => {
    const instance = {
      decoratedProps: {
        allowAd: true,
      },
    };

    class NoneBaseWebsiteOptions extends BaseWebsiteOptions {
      @DescriptionField({ descriptionType: DescriptionType.NONE })
      description: DescriptionValue;
    }

    const defaultOptions = createWebsiteOptions(testDescription);
    const websiteOptions = createWebsiteOptions(undefined);
    const description = await service.parse(
      instance as unknown as UnknownWebsite,
      new DefaultWebsiteOptions(defaultOptions.data),
      new NoneBaseWebsiteOptions(websiteOptions.data),
      [],
      '',
    );
    expect(description).toEqual(undefined);
  });

  it('should insert ad if allowed in settings and website', async () => {
    settingsService.getDefaultSettings = jest.fn().mockResolvedValue({
      settings: {
        hiddenWebsites: [],
        language: 'en',
        allowAd: true,
      },
    });
    const instance = {
      decoratedProps: {
        allowAd: true,
        metadata: {
          name: 'Test',
        },
      },
    };

    const defaultOptions = createWebsiteOptions(testDescription);
    const websiteOptions = createWebsiteOptions(undefined);
    const description = await service.parse(
      instance as unknown as UnknownWebsite,
      new DefaultWebsiteOptions(defaultOptions.data),
      new BaseWebsiteOptions(websiteOptions.data),
      [],
      '',
    );

    expect(description).toMatchInlineSnapshot(
      `"<div><span><b>Hello, </b></span>World!<br><a target="_blank" href="https://postybirb.com">A link</a></div><div></div><div><a target="_blank" href="https://postybirb.com">Posted using PostyBirb</a></div>"`,
    );
  });

  it('should not insert ad if allowed in settings and not website', async () => {
    settingsService.getDefaultSettings = jest.fn().mockResolvedValue({
      settings: {
        hiddenWebsites: [],
        language: 'en',
        allowAd: true,
      },
    });
    const instance = {
      decoratedProps: {
        allowAd: false,
        metadata: {
          name: 'Test',
        },
      },
    };

    const defaultOptions = createWebsiteOptions(testDescription);
    const websiteOptions = createWebsiteOptions(undefined);
    const description = await service.parse(
      instance as unknown as UnknownWebsite,
      new DefaultWebsiteOptions(defaultOptions.data),
      new BaseWebsiteOptions(websiteOptions.data),
      [],
      '',
    );

    expect(description).toMatchInlineSnapshot(
      `"<div><span><b>Hello, </b></span>World!<br><a target="_blank" href="https://postybirb.com">A link</a></div>"`,
    );
  });

  it('should merge similar description blocks', async () => {
    const unmerged = [
      {
        id: '5ab98087-8624-43fc-987f-80f0bdcf84d9',
        type: 'paragraph',
        props: {
          textColor: 'default',
          backgroundColor: 'default',
          textAlignment: 'left',
        },
        content: [
          {
            type: 'text',
            text: 'Test\nIn the same block!',
            styles: {},
          },
        ],
        children: [],
      },
      {
        id: '6930a7e1-e6d2-4480-9ecb-34e1089580a2',
        type: 'paragraph',
        props: {
          textColor: 'default',
          backgroundColor: 'default',
          textAlignment: 'left',
        },
        content: [
          {
            type: 'text',
            text: 'New block',
            styles: {},
          },
        ],
        children: [],
      },
      {
        id: '8573e2d6-9294-4a89-b08a-c751f8847913',
        type: 'paragraph',
        props: {
          textColor: 'yellow',
          backgroundColor: 'default',
          textAlignment: 'left',
        },
        content: [
          {
            type: 'text',
            text: 'block',
            styles: {},
          },
        ],
        children: [],
      },
    ];

    const expected = [
      {
        id: '5ab98087-8624-43fc-987f-80f0bdcf84d9',
        type: 'paragraph',
        props: {
          textColor: 'default',
          backgroundColor: 'default',
          textAlignment: 'left',
        },
        content: [
          {
            type: 'text',
            text: 'Test\nIn the same block!',
            styles: {},
          },
          {
            type: 'text',
            text: '\n',
            styles: {},
            props: {},
          },
          {
            type: 'text',
            text: 'New block',
            styles: {},
          },
        ],
        children: [],
      },
      {
        id: '8573e2d6-9294-4a89-b08a-c751f8847913',
        type: 'paragraph',
        props: {
          textColor: 'yellow',
          backgroundColor: 'default',
          textAlignment: 'left',
        },
        content: [
          {
            type: 'text',
            text: 'block',
            styles: {},
          },
        ],
        children: [],
      },
    ];

    const merged = service.mergeBlocks(
      unmerged as unknown as Array<IDescriptionBlockNode>,
    );
    expect(merged).toEqual(expected);
  });

  it('should insert default when available', async () => {
    const instance = {
      decoratedProps: {
        allowAd: true,
        metadata: {
          name: 'Test',
        },
      },
    };

    class PlaintextBaseWebsiteOptions extends BaseWebsiteOptions {
      @DescriptionField({ descriptionType: DescriptionType.PLAINTEXT })
      description: DescriptionValue;
    }

    const defaultOptions = createWebsiteOptions(testDescription);
    const websiteOptions = createWebsiteOptions([
      {
        id: 'test-basic-default',
        type: 'defaultShortcut',
        props: {} as never,
        content: [] as never,
        children: [],
      },
      {
        id: 'test-basic-text',
        type: 'paragraph',
        props: {
          textColor: 'default',
          backgroundColor: 'default',
          textAlignment: 'left',
        },
        content: [{ type: 'text', text: 'Hello, Basic', styles: {} }],
        children: [],
      },
    ]);
    websiteOptions.data.description.overrideDefault = true;
    const description = await service.parse(
      instance as unknown as UnknownWebsite,
      new DefaultWebsiteOptions(defaultOptions.data),
      new PlaintextBaseWebsiteOptions(websiteOptions.data),
      [],
      '',
    );
    expect(description).toMatchInlineSnapshot(`
      "Hello, World!
      A link: https://postybirb.com
      Hello, Basic"
    `);
  });

  describe('Custom Shortcuts', () => {
    it('should inject single custom shortcut', async () => {
      const instance = {
        decoratedProps: {
          allowAd: false,
          metadata: {
            name: 'Test',
          },
        },
      };

      const shortcutContent: Description = [
        {
          id: 'shortcut-1',
          type: 'paragraph',
          props: {
            textColor: 'default',
            backgroundColor: 'default',
            textAlignment: 'left',
          },
          content: [
            { type: 'text', text: 'Commission Info', styles: { bold: true } },
          ],
          children: [],
        },
      ];

      customShortcutsService.findById = jest.fn().mockResolvedValue({
        id: 'cs-1',
        name: 'commission',
        shortcut: shortcutContent,
      });

      const descriptionWithShortcut: Description = [
        {
          id: 'test-with-shortcut',
          type: 'paragraph',
          props: {
            textColor: 'default',
            backgroundColor: 'default',
            textAlignment: 'left',
          },
          content: [
            { type: 'text', text: 'Check out my ', styles: {} },
            { type: 'customShortcut', props: { id: 'cs-1' }, content: [] },
          ],
          children: [],
        },
      ];

      const defaultOptions = createWebsiteOptions(descriptionWithShortcut);
      const websiteOptions = createWebsiteOptions(undefined);
      const description = await service.parse(
        instance as unknown as UnknownWebsite,
        new DefaultWebsiteOptions(defaultOptions.data),
        new BaseWebsiteOptions(websiteOptions.data),
        [],
        '',
      );

      expect(customShortcutsService.findById).toHaveBeenCalledWith('cs-1');
      expect(description).toMatchInlineSnapshot(
        `"<div>Check out my <div><span><b>Commission Info</b></span></div></div>"`,
      );
    });

    it('should inject multiple custom shortcuts', async () => {
      const instance = {
        decoratedProps: {
          allowAd: false,
          metadata: {
            name: 'Test',
          },
        },
      };

      const commissionShortcut: Description = [
        {
          id: 'shortcut-1',
          type: 'paragraph',
          props: {
            textColor: 'default',
            backgroundColor: 'default',
            textAlignment: 'left',
          },
          content: [{ type: 'text', text: 'Commissions Open!', styles: {} }],
          children: [],
        },
      ];

      const priceShortcut: Description = [
        {
          id: 'shortcut-2',
          type: 'paragraph',
          props: {
            textColor: 'default',
            backgroundColor: 'default',
            textAlignment: 'left',
          },
          content: [{ type: 'text', text: '$50 per hour', styles: {} }],
          children: [],
        },
      ];

      customShortcutsService.findById = jest
        .fn()
        .mockImplementation((id: string) => {
          if (id === 'cs-1')
            return Promise.resolve({
              id: 'cs-1',
              name: 'commission',
              shortcut: commissionShortcut,
            });
          if (id === 'cs-2')
            return Promise.resolve({
              id: 'cs-2',
              name: 'price',
              shortcut: priceShortcut,
            });
          return Promise.resolve(null);
        });

      const descriptionWithShortcuts: Description = [
        {
          id: 'test-multiple',
          type: 'paragraph',
          props: {
            textColor: 'default',
            backgroundColor: 'default',
            textAlignment: 'left',
          },
          content: [
            { type: 'customShortcut', props: { id: 'cs-1' }, content: [] },
            { type: 'text', text: ' - ', styles: {} },
            { type: 'customShortcut', props: { id: 'cs-2' }, content: [] },
          ],
          children: [],
        },
      ];

      const defaultOptions = createWebsiteOptions(descriptionWithShortcuts);
      const websiteOptions = createWebsiteOptions(undefined);
      const description = await service.parse(
        instance as unknown as UnknownWebsite,
        new DefaultWebsiteOptions(defaultOptions.data),
        new BaseWebsiteOptions(websiteOptions.data),
        [],
        '',
      );

      expect(customShortcutsService.findById).toHaveBeenCalledWith('cs-1');
      expect(customShortcutsService.findById).toHaveBeenCalledWith('cs-2');
      expect(description).toMatchInlineSnapshot(
        `"<div><div>Commissions Open!</div> - <div>$50 per hour</div></div>"`,
      );
    });

    it('should handle missing custom shortcut gracefully', async () => {
      const instance = {
        decoratedProps: {
          allowAd: false,
          metadata: {
            name: 'Test',
          },
        },
      };

      customShortcutsService.findById = jest.fn().mockResolvedValue(null);

      const descriptionWithMissing: Description = [
        {
          id: 'test-missing',
          type: 'paragraph',
          props: {
            textColor: 'default',
            backgroundColor: 'default',
            textAlignment: 'left',
          },
          content: [
            { type: 'text', text: 'Before ', styles: {} },
            {
              type: 'customShortcut',
              props: { id: 'cs-missing' },
              content: [],
            },
            { type: 'text', text: ' After', styles: {} },
          ],
          children: [],
        },
      ];

      const defaultOptions = createWebsiteOptions(descriptionWithMissing);
      const websiteOptions = createWebsiteOptions(undefined);
      const description = await service.parse(
        instance as unknown as UnknownWebsite,
        new DefaultWebsiteOptions(defaultOptions.data),
        new BaseWebsiteOptions(websiteOptions.data),
        [],
        '',
      );

      expect(customShortcutsService.findById).toHaveBeenCalledWith(
        'cs-missing',
      );
      // Missing shortcut should be ignored/skipped
      expect(description).toMatchInlineSnapshot(`"<div>Before  After</div>"`);
    });

    it('should resolve custom shortcuts with different output formats', async () => {
      const instance = {
        decoratedProps: {
          allowAd: false,
          metadata: {
            name: 'Test',
          },
        },
      };

      class PlaintextBaseWebsiteOptions extends BaseWebsiteOptions {
        @DescriptionField({ descriptionType: DescriptionType.PLAINTEXT })
        description: DescriptionValue;
      }

      const shortcutContent: Description = [
        {
          id: 'shortcut-1',
          type: 'paragraph',
          props: {
            textColor: 'default',
            backgroundColor: 'default',
            textAlignment: 'left',
          },
          content: [
            { type: 'text', text: 'Bold Text', styles: { bold: true } },
          ],
          children: [],
        },
      ];

      customShortcutsService.findById = jest.fn().mockResolvedValue({
        id: 'cs-1',
        name: 'bold',
        shortcut: shortcutContent,
      });

      const descriptionWithShortcut: Description = [
        {
          id: 'test-plaintext',
          type: 'paragraph',
          props: {
            textColor: 'default',
            backgroundColor: 'default',
            textAlignment: 'left',
          },
          content: [
            { type: 'text', text: 'Text: ', styles: {} },
            { type: 'customShortcut', props: { id: 'cs-1' }, content: [] },
          ],
          children: [],
        },
      ];

      const defaultOptions = createWebsiteOptions(descriptionWithShortcut);
      const websiteOptions = createWebsiteOptions(undefined);
      const description = await service.parse(
        instance as unknown as UnknownWebsite,
        new DefaultWebsiteOptions(defaultOptions.data),
        new PlaintextBaseWebsiteOptions(websiteOptions.data),
        [],
        '',
      );

      expect(description).toMatchInlineSnapshot(`"Text: Bold Text"`);
    });

    it('should resolve custom shortcuts with links and styling', async () => {
      const instance = {
        decoratedProps: {
          allowAd: false,
          metadata: {
            name: 'Test',
          },
        },
      };

      const shortcutWithLink: Description = [
        {
          id: 'shortcut-link',
          type: 'paragraph',
          props: {
            textColor: 'default',
            backgroundColor: 'default',
            textAlignment: 'left',
          },
          content: [
            { type: 'text', text: 'Visit my ', styles: {} },
            {
              type: 'link',
              href: 'https://portfolio.example.com',
              content: [
                { type: 'text', text: 'portfolio', styles: { bold: true } },
              ],
            },
          ],
          children: [],
        },
      ];

      customShortcutsService.findById = jest.fn().mockResolvedValue({
        id: 'cs-link',
        name: 'portfolio',
        shortcut: shortcutWithLink,
      });

      const descriptionWithShortcut: Description = [
        {
          id: 'test-link',
          type: 'paragraph',
          props: {
            textColor: 'default',
            backgroundColor: 'default',
            textAlignment: 'left',
          },
          content: [
            { type: 'customShortcut', props: { id: 'cs-link' }, content: [] },
          ],
          children: [],
        },
      ];

      const defaultOptions = createWebsiteOptions(descriptionWithShortcut);
      const websiteOptions = createWebsiteOptions(undefined);
      const description = await service.parse(
        instance as unknown as UnknownWebsite,
        new DefaultWebsiteOptions(defaultOptions.data),
        new BaseWebsiteOptions(websiteOptions.data),
        [],
        '',
      );

      expect(description).toMatchInlineSnapshot(
        `"<div><div>Visit my <a target="_blank" href="https://portfolio.example.com"><span><b>portfolio</b></span></a></div></div>"`,
      );
    });
  });

  describe('System Inline Shortcuts', () => {
    it('should render titleShortcut with submission title', async () => {
      const instance = {
        decoratedProps: {
          allowAd: false,
          metadata: {
            name: 'Test',
          },
        },
      };

      const descriptionWithTitle = [
        {
          id: 'test-title',
          type: 'paragraph',
          props: {
            textColor: 'default',
            backgroundColor: 'default',
            textAlignment: 'left',
          },
          content: [
            { type: 'text', text: 'Artwork: ', styles: {} },
            { type: 'titleShortcut', props: {} },
          ],
          children: [],
        },
      ] as Description;

      const defaultOptions = createWebsiteOptions(descriptionWithTitle);
      const websiteOptions = createWebsiteOptions(undefined);
      const description = await service.parse(
        instance as unknown as UnknownWebsite,
        new DefaultWebsiteOptions(defaultOptions.data),
        new BaseWebsiteOptions(websiteOptions.data),
        [],
        'My Amazing Art',
      );

      expect(description).toMatchInlineSnapshot(
        `"<div>Artwork: <span>My Amazing Art</span></div>"`,
      );
    });

    it('should render tagsShortcut with submission tags', async () => {
      const instance = {
        decoratedProps: {
          allowAd: false,
          metadata: {
            name: 'Test',
          },
        },
      };

      const descriptionWithTags = [
        {
          id: 'test-tags',
          type: 'paragraph',
          props: {
            textColor: 'default',
            backgroundColor: 'default',
            textAlignment: 'left',
          },
          content: [
            { type: 'text', text: 'Tags: ', styles: {} },
            { type: 'tagsShortcut', props: {} },
          ],
          children: [],
        },
      ] as Description;

      const defaultOptions = createWebsiteOptions(descriptionWithTags);
      const websiteOptions = createWebsiteOptions(undefined);
      const description = await service.parse(
        instance as unknown as UnknownWebsite,
        new DefaultWebsiteOptions(defaultOptions.data),
        new BaseWebsiteOptions(websiteOptions.data),
        ['art', 'digital', 'fantasy'],
        '',
      );

      expect(description).toMatchInlineSnapshot(
        `"<div>Tags: <span>#art #digital #fantasy</span></div>"`,
      );
    });

    it('should render contentWarningShortcut with content warning', async () => {
      const instance = {
        decoratedProps: {
          allowAd: false,
          metadata: {
            name: 'Test',
          },
        },
      };

      const descriptionWithCW = [
        {
          id: 'test-cw',
          type: 'paragraph',
          props: {
            textColor: 'default',
            backgroundColor: 'default',
            textAlignment: 'left',
          },
          content: [
            { type: 'text', text: 'Content Warning: ', styles: {} },
            { type: 'contentWarningShortcut', props: {} },
          ],
          children: [],
        },
      ] as Description;

      const defaultOptions = new DefaultWebsiteOptions({
        description: { description: descriptionWithCW, overrideDefault: false },
        contentWarning: 'Mild Violence',
      });
      const websiteOptions = new BaseWebsiteOptions({});
      const description = await service.parse(
        instance as unknown as UnknownWebsite,
        defaultOptions,
        websiteOptions,
        [],
        '',
      );

      expect(description).toMatchInlineSnapshot(
        `"<div>Content Warning: <span>Mild Violence</span></div>"`,
      );
    });

    it('should not double-insert title when titleShortcut is present and insertTitle is true', async () => {
      const instance = {
        decoratedProps: {
          allowAd: false,
          metadata: {
            name: 'Test',
          },
        },
      };

      const descriptionWithTitle = [
        {
          id: 'test-title-no-double',
          type: 'paragraph',
          props: {
            textColor: 'default',
            backgroundColor: 'default',
            textAlignment: 'left',
          },
          content: [
            { type: 'text', text: 'Title: ', styles: {} },
            { type: 'titleShortcut', props: {} },
          ],
          children: [],
        },
      ] as Description;

      const defaultOptions = createWebsiteOptions(descriptionWithTitle);
      defaultOptions.data.description.insertTitle = true;
      const websiteOptions = createWebsiteOptions(undefined);
      const description = await service.parse(
        instance as unknown as UnknownWebsite,
        new DefaultWebsiteOptions(defaultOptions.data),
        new BaseWebsiteOptions(websiteOptions.data),
        [],
        'My Title',
      );

      // Title should only appear once (from the shortcut), not twice
      expect(description).toMatchInlineSnapshot(
        `"<div>Title: <span>My Title</span></div>"`,
      );
      expect((description.match(/My Title/g) || []).length).toBe(1);
    });

    it('should not double-insert tags when tagsShortcut is present and insertTags is true', async () => {
      const instance = {
        decoratedProps: {
          allowAd: false,
          metadata: {
            name: 'Test',
          },
        },
      };

      const descriptionWithTags = [
        {
          id: 'test-tags-no-double',
          type: 'paragraph',
          props: {
            textColor: 'default',
            backgroundColor: 'default',
            textAlignment: 'left',
          },
          content: [
            { type: 'text', text: 'Tags: ', styles: {} },
            { type: 'tagsShortcut', props: {} },
          ],
          children: [],
        },
      ] as Description;

      const defaultOptions = createWebsiteOptions(descriptionWithTags);
      defaultOptions.data.description.insertTags = true;
      const websiteOptions = createWebsiteOptions(undefined);
      const description = await service.parse(
        instance as unknown as UnknownWebsite,
        new DefaultWebsiteOptions(defaultOptions.data),
        new BaseWebsiteOptions(websiteOptions.data),
        ['tag1', 'tag2'],
        '',
      );

      // Tags should only appear once (from the shortcut), not twice
      expect(description).toMatchInlineSnapshot(
        `"<div>Tags: <span>#tag1 #tag2</span></div>"`,
      );
      expect((description.match(/#tag1 #tag2/g) || []).length).toBe(1);
    });

    it('should render all system shortcuts together in plaintext', async () => {
      const instance = {
        decoratedProps: {
          allowAd: false,
          metadata: {
            name: 'Test',
          },
        },
      };

      class PlaintextBaseWebsiteOptions extends BaseWebsiteOptions {
        @DescriptionField({ descriptionType: DescriptionType.PLAINTEXT })
        description: DescriptionValue;
      }

      const descriptionWithAll = [
        {
          id: 'test-all-shortcuts',
          type: 'paragraph',
          props: {
            textColor: 'default',
            backgroundColor: 'default',
            textAlignment: 'left',
          },
          content: [
            { type: 'titleShortcut', props: {} },
            { type: 'text', text: ' (', styles: {} },
            { type: 'contentWarningShortcut', props: {} },
            { type: 'text', text: ')', styles: {} },
          ],
          children: [],
        },
        {
          id: 'test-tags-line',
          type: 'paragraph',
          props: {
            textColor: 'default',
            backgroundColor: 'default',
            textAlignment: 'left',
          },
          content: [{ type: 'tagsShortcut', props: {} }],
          children: [],
        },
      ] as Description;

      const defaultOptions = new DefaultWebsiteOptions({
        description: {
          description: descriptionWithAll,
          overrideDefault: false,
        },
        contentWarning: 'NSFW',
      });
      const websiteOptions = new PlaintextBaseWebsiteOptions({});
      const description = await service.parse(
        instance as unknown as UnknownWebsite,
        defaultOptions,
        websiteOptions,
        ['art', 'digital'],
        'My Art',
      );

      expect(description).toMatchInlineSnapshot(`
        "My Art (NSFW)
        #art #digital"
      `);
    });
  });

  // TODO: Add test for description type CUSTOM
});
