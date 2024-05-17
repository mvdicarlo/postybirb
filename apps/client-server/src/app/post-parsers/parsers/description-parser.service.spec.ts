import { Test, TestingModule } from '@nestjs/testing';
import {
    Description,
    DescriptionType,
    IWebsiteOptions,
} from '@postybirb/types';
import { Class } from 'type-fest';
import { WEBSITE_IMPLEMENTATIONS } from '../../constants';
import { SettingsService } from '../../settings/settings.service';
import { UnknownWebsite } from '../../websites/website';
import { DescriptionParserService } from './description-parser.service';

describe('DescriptionParserService', () => {
  let module: TestingModule;
  let service: DescriptionParserService;
  let settingsService: SettingsService;
  let websiteImplementations: Class<UnknownWebsite>[];
  const testDescription: Description = [
    {
      id: 'test-empty',
      type: 'paragraph',
      props: {
        textColor: 'default',
        backgroundColor: 'default',
        textAlignment: 'left',
      },
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
      content: [{ type: 'text', text: 'Hello, World!', styles: {} }],
      children: [],
    },
    {
      id: 'testlink', // ! consider the fact that an inline may not wrap a text node
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
    websiteImplementations = [];
  });

  afterAll(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should parse plaintext description', async () => {
    settingsService.getDefaultSettings = jest.fn().mockResolvedValue({
      settings: {
        hiddenWebsites: [],
        language: 'en',
        allowAd: false,
      },
    });
    const instance = {
      decoratedProps: {
        descriptionSupport: {
          supportsDescriptionType: DescriptionType.PLAINTEXT,
        },
      },
    };

    const defaultOptions: IWebsiteOptions = {
      data: {
        description: {
          description: testDescription,
        },
      },
    } as IWebsiteOptions;
    const websiteOptions: IWebsiteOptions = {
      data: {
        description: {
          description: undefined,
        },
      },
    } as IWebsiteOptions;
    const description = await service.parse(
      instance as unknown as UnknownWebsite,
      defaultOptions,
      websiteOptions,
      [],
      ''
    );
    expect(description).toEqual('Hello, World!\n\nPosted using PostyBirb');
  });
});
