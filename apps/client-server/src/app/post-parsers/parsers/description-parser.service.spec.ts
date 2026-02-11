/* eslint-disable max-classes-per-file */
import { Test, TestingModule } from '@nestjs/testing';
import { clearDatabase } from '@postybirb/database';
import { DescriptionField } from '@postybirb/form-builder';
import {
    Description,
    DescriptionType,
    DescriptionValue,
    IWebsiteOptions,
    TipTapNode,
} from '@postybirb/types';
import { WEBSITE_IMPLEMENTATIONS } from '../../constants';
import { CustomShortcutsService } from '../../custom-shortcuts/custom-shortcuts.service';
import { SettingsService } from '../../settings/settings.service';
import { UserConvertersService } from '../../user-converters/user-converters.service';
import { BaseWebsiteOptions } from '../../websites/models/base-website-options';
import { DefaultWebsiteOptions } from '../../websites/models/default-website-options';
import { UnknownWebsite } from '../../websites/website';
import { DescriptionParserService } from './description-parser.service';

describe('DescriptionParserService', () => {
  let module: TestingModule;
  let service: DescriptionParserService;
  let settingsService: SettingsService;
  let customShortcutsService: CustomShortcutsService;
  let userConvertersService: UserConvertersService;

  const testDescription: Description = {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Hello, ', marks: [{ type: 'bold' }] },
          { type: 'text', text: 'World!' },
        ],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'A link',
            marks: [
              {
                type: 'link',
                attrs: { href: 'https://postybirb.com' },
              },
            ],
          },
        ],
      },
    ],
  };

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
    const unmerged: TipTapNode[] = [
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'Test\nIn the same block!',
          },
        ],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'New block',
          },
        ],
      },
      {
        type: 'paragraph',
        attrs: { textAlign: 'center' },
        content: [
          {
            type: 'text',
            text: 'block',
          },
        ],
      },
    ];

    const expected: TipTapNode[] = [
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'Test\nIn the same block!',
          },
          {
            type: 'text',
            text: '\n',
          },
          {
            type: 'text',
            text: 'New block',
          },
        ],
      },
      {
        type: 'paragraph',
        attrs: { textAlign: 'center' },
        content: [
          {
            type: 'text',
            text: 'block',
          },
        ],
      },
    ];

    const merged = service.mergeBlocks(unmerged);
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
    const websiteDesc: Description = {
      type: 'doc',
      content: [
        {
          type: 'defaultShortcut',
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Hello, Basic' }],
        },
      ],
    };
    const websiteOptions = createWebsiteOptions(websiteDesc);
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

      const shortcutContent: Description = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Commission Info',
                marks: [{ type: 'bold' }],
              },
            ],
          },
        ],
      };

      customShortcutsService.findById = jest.fn().mockResolvedValue({
        id: 'cs-1',
        name: 'commission',
        shortcut: shortcutContent,
      });

      const descriptionWithShortcut: Description = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Check out my ' },
              { type: 'customShortcut', attrs: { id: 'cs-1' } },
            ],
          },
        ],
      };

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

      const commissionShortcut: Description = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Commissions Open!' }],
          },
        ],
      };

      const priceShortcut: Description = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: '$50 per hour' }],
          },
        ],
      };

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

      const descriptionWithShortcuts: Description = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'customShortcut', attrs: { id: 'cs-1' } },
              { type: 'text', text: ' - ' },
              { type: 'customShortcut', attrs: { id: 'cs-2' } },
            ],
          },
        ],
      };

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

      const descriptionWithMissing: Description = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Before ' },
              {
                type: 'customShortcut',
                attrs: { id: 'cs-missing' },
              },
              { type: 'text', text: ' After' },
            ],
          },
        ],
      };

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

      const shortcutContent: Description = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Bold Text',
                marks: [{ type: 'bold' }],
              },
            ],
          },
        ],
      };

      customShortcutsService.findById = jest.fn().mockResolvedValue({
        id: 'cs-1',
        name: 'bold',
        shortcut: shortcutContent,
      });

      const descriptionWithShortcut: Description = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Text: ' },
              { type: 'customShortcut', attrs: { id: 'cs-1' } },
            ],
          },
        ],
      };

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

      const shortcutWithLink: Description = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Visit my ' },
              {
                type: 'text',
                text: 'portfolio',
                marks: [
                  { type: 'bold' },
                  {
                    type: 'link',
                    attrs: { href: 'https://portfolio.example.com' },
                  },
                ],
              },
            ],
          },
        ],
      };

      customShortcutsService.findById = jest.fn().mockResolvedValue({
        id: 'cs-link',
        name: 'portfolio',
        shortcut: shortcutWithLink,
      });

      const descriptionWithShortcut: Description = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'customShortcut', attrs: { id: 'cs-link' } },
            ],
          },
        ],
      };

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

      const descriptionWithTitle: Description = {
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
      };

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

      const descriptionWithTags: Description = {
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
      };

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

      const descriptionWithCW: Description = {
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
      };

      const defaultOptions = new DefaultWebsiteOptions({
        description: {
          description: descriptionWithCW,
          overrideDefault: false,
        },
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

      const descriptionWithTitle: Description = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Title: ' },
              { type: 'titleShortcut', attrs: {} },
            ],
          },
        ],
      };

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

      const descriptionWithTags: Description = {
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
      };

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

      const descriptionWithAll: Description = {
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
      };

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
