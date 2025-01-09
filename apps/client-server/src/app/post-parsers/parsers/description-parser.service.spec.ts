import { Test, TestingModule } from '@nestjs/testing';
import {
  Description,
  DescriptionType,
  IWebsiteOptions,
} from '@postybirb/types';
import { Class } from 'type-fest';
import { WEBSITE_IMPLEMENTATIONS } from '../../constants';
import { SettingsService } from '../../settings/settings.service';
import { BaseWebsiteOptions } from '../../websites/models/base-website-options';
import { DefaultWebsiteOptions } from '../../websites/models/default-website-options';
import { UnknownWebsite } from '../../websites/website';
import { DescriptionParserService } from './description-parser.service';

describe('DescriptionParserService', () => {
  let module: TestingModule;
  let service: DescriptionParserService;
  let settingsService: SettingsService;
  let websiteImplementations: Class<UnknownWebsite>[];
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
          content: [
            { type: 'text', text: 'Posted using PostyBirb', styles: {} },
          ],
        },
      ],
      children: [],
    },
  ];

  beforeEach(async () => {
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
          provide: WEBSITE_IMPLEMENTATIONS,
          useValue: [],
        },
      ],
    }).compile();
    service = module.get(DescriptionParserService);
    settingsService = module.get(SettingsService);
    settingsService.getDefaultSettings = jest.fn().mockResolvedValue({
      settings: {
        hiddenWebsites: [],
        language: 'en',
        allowAd: false,
      },
    });
    websiteImplementations = [];
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
        descriptionSupport: {
          supportsDescriptionType: DescriptionType.PLAINTEXT,
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
    expect(description).toEqual('Hello, World!\r\nPosted using PostyBirb');
  });

  it('should parse html description', async () => {
    const instance = {
      decoratedProps: {
        descriptionSupport: {
          supportsDescriptionType: DescriptionType.HTML,
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
    expect(description).toEqual(
      '<div><span><b>Hello, </b></span>World!</div><div><a target="_blank" href="https://postybirb.com">Posted using PostyBirb</a></div>',
    );
  });

  it('should parse markdown description', async () => {
    const instance = {
      decoratedProps: {
        descriptionSupport: {
          supportsDescriptionType: DescriptionType.MARKDOWN,
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
    expect(description).toEqual(
      '**Hello,** World!\n\n[Posted using PostyBirb](https://postybirb.com)',
    );
  });

  it('should return empty for description type NONE', async () => {
    const instance = {
      decoratedProps: {
        descriptionSupport: {
          supportsDescriptionType: DescriptionType.NONE,
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
    expect(description).toEqual(undefined);
  });
  // TODO: Add test for description type CUSTOM
  // TODO: Add test for ad injection (setting and instance based)
  // TODO: Add test for shortcuts (ensure plaintext works as expected)
});
