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
          provide: WEBSITE_IMPLEMENTATIONS,
          useValue: [],
        },
      ],
    }).compile();
    service = module.get(DescriptionParserService);
    settingsService = module.get(SettingsService);
    customShortcutsService = module.get(CustomShortcutsService);
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
        type: 'default',
        props: {} as never,
        content: [],
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

  describe('CustomShortcuts ', () => {
    it('HTML unwrapping: unwrap <p> around shortcut marker before injection', async () => {
      // Arrange
      const content = '<p><%PB_CUSTOM_SHORTCUT:abc-123%></p>';
      const replacement = 'INJECTED_HTML';
      (customShortcutsService.findById as jest.Mock).mockResolvedValue({
        name: 'test',
        id: 'abc-123',
        shortcut: [
          {
            id: 'shortcut-block',
            type: 'paragraph',
            props: {
              textColor: 'default',
              backgroundColor: 'default',
              textAlignment: 'left',
            },
            content: [{ type: 'text', text: 'Ignored', styles: {} }],
            children: [],
          },
        ],
      });
      jest
        .spyOn(
          service as unknown as { createDescription: Function },
          'createDescription',
        )
        .mockReturnValue(replacement as any);

      // Act
      const result = await service.injectCustomShortcuts(
        content,
        DescriptionType.HTML,
        { decoratedProps: { metadata: { name: 'Test' } } } as any,
        'title',
        ['tag1'],
      );

      // Assert
      expect(result).toContain(replacement);
      expect(result).not.toContain('<p>');
      expect(result).not.toContain('</p>');
      expect(customShortcutsService.findById).toHaveBeenCalledWith('abc-123');
    });

    it('Injection on multiple shortcuts present: replaces all markers', async () => {
      // Arrange
      const content =
        'A <%PB_CUSTOM_SHORTCUT:one%> B <%PB_CUSTOM_SHORTCUT:two%> C';
      (customShortcutsService.findById as jest.Mock)
        .mockResolvedValueOnce({
          shortcut: [
            {
              type: 'paragraph',
              props: {},
              content: [{ type: 'text', text: 'First', styles: {} }],
              children: [],
            },
          ],
        })
        .mockResolvedValueOnce({
          shortcut: [
            {
              type: 'paragraph',
              props: {},
              content: [{ type: 'text', text: 'Second', styles: {} }],
              children: [],
            },
          ],
        });
      const spy = jest
        .spyOn(
          service as unknown as { createDescription: Function },
          'createDescription',
        )
        .mockReturnValueOnce('REPL_ONE' as any)
        .mockReturnValueOnce('REPL_TWO' as any);

      // Act
      const result = await service.injectCustomShortcuts(
        content,
        DescriptionType.HTML,
        { decoratedProps: { metadata: { name: 'Test' } } } as any,
        'title',
        ['tag1'],
      );

      // Assert
      expect(result).toContain('REPL_ONE');
      expect(result).toContain('REPL_TWO');
      expect(result).not.toContain('<%PB_CUSTOM_SHORTCUT:one%>');
      expect(result).not.toContain('<%PB_CUSTOM_SHORTCUT:two%>');
      expect(customShortcutsService.findById).toHaveBeenCalledTimes(2);
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it('No injection when no shortcuts present: content unchanged', async () => {
      // Arrange
      const content = 'No markers here.';
      (customShortcutsService.findById as jest.Mock).mockClear();

      // Act
      const result = await service.injectCustomShortcuts(
        content,
        DescriptionType.MARKDOWN,
        { decoratedProps: { metadata: { name: 'Test' } } } as any,
        'title',
        ['tag1'],
      );

      // Assert
      expect(result).toBe(content);
      expect(customShortcutsService.findById).not.toHaveBeenCalled();
    });

    it('Strips remaining markers (including wrapped) when shortcuts not found', async () => {
      // Arrange
      (customShortcutsService.findById as jest.Mock).mockResolvedValue(
        undefined,
      );
      const marker1 = '<%PB_CUSTOM_SHORTCUT:notfound%>';
      const marker2 = '<p><%PB_CUSTOM_SHORTCUT:also-missing%></p>';
      const content = `Before ${marker1} Middle ${marker2} After`;

      // Act
      const result = await service.injectCustomShortcuts(
        content,
        DescriptionType.HTML,
        { decoratedProps: { metadata: { name: 'Test' } } } as any,
        'title',
        ['tag1'],
      );

      // Assert
      expect(result).not.toContain(marker1);
      expect(result).not.toContain('also-missing');
      expect(result).not.toContain('<p>');
      expect(result).not.toContain('</p>');
      expect(result).toContain('Before');
      expect(result).toContain('Middle');
      expect(result).toContain('After');
    });
  });

  // TODO: Add test for description type CUSTOM
  // TODO: Add test for title and tag insertion
});
