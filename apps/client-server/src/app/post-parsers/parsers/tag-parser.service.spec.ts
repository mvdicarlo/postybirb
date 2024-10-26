import { Test, TestingModule } from '@nestjs/testing';
import { IWebsiteOptions } from '@postybirb/types';
import { TagConvertersService } from '../../tag-converters/tag-converters.service';
import { UnknownWebsite } from '../../websites/website';
import { TagParserService } from './tag-parser.service';

describe('TagParserService', () => {
  let module: TestingModule;
  let service: TagParserService;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        TagParserService,
        {
          provide: TagConvertersService,
          useValue: {
            convert: (_, tags: string[]) => tags,
          },
        },
      ],
    }).compile();
    service = module.get(TagParserService);
  });

  afterAll(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should parse tags', async () => {
    const instance = {
      decoratedProps: {
        tagSupport: {
          supportsTags: true,
          maxTags: Infinity,
        },
      },
    };
    const defaultOptions: IWebsiteOptions = {
      data: {
        tags: {
          tags: ['default'],
        },
      },
    } as IWebsiteOptions;
    const websiteOptions: IWebsiteOptions = {
      data: {
        tags: {
          tags: ['website'],
        },
      },
    } as IWebsiteOptions;
    const tags = [
      ...defaultOptions.data.tags.tags,
      ...websiteOptions.data.tags.tags,
    ];
    const result = await service.parse(
      instance as unknown as UnknownWebsite,
      defaultOptions,
      websiteOptions,
    );

    expect(result).toEqual(tags);
  });

  it('should parse tags with default tags override', async () => {
    const instance = {
      decoratedProps: {
        tagSupport: {
          supportsTags: true,
          maxTags: Infinity,
        },
      },
    };
    const defaultOptions: IWebsiteOptions = {
      data: {
        tags: {
          tags: ['default'],
        },
      },
    } as IWebsiteOptions;
    const websiteOptions: IWebsiteOptions = {
      data: {
        tags: {
          tags: ['website'],
          overrideDefault: true,
        },
      },
    } as IWebsiteOptions;
    const { tags } = websiteOptions.data.tags;

    const result = await service.parse(
      instance as unknown as UnknownWebsite,
      defaultOptions,
      websiteOptions,
    );

    expect(result).toEqual(tags);
  });

  it('should parse tags with no website options', async () => {
    const instance = {
      decoratedProps: {
        tagSupport: {
          supportsTags: true,
          maxTags: Infinity,
        },
      },
    };
    const defaultOptions: IWebsiteOptions = {
      data: {
        tags: {
          tags: ['default'],
        },
      },
    } as IWebsiteOptions;
    const websiteOptions: IWebsiteOptions = {
      data: {},
    } as IWebsiteOptions;
    const { tags } = defaultOptions.data.tags;

    const result = await service.parse(
      instance as unknown as UnknownWebsite,
      defaultOptions,
      websiteOptions,
    );

    expect(result).toEqual(tags);
  });

  it('should parse tags with no website options and no default tags', async () => {
    const instance = {
      decoratedProps: {
        tagSupport: {
          supportsTags: true,
          maxTags: Infinity,
        },
      },
    };
    const defaultOptions: IWebsiteOptions = {
      data: {},
    } as IWebsiteOptions;
    const websiteOptions: IWebsiteOptions = {
      data: {},
    } as IWebsiteOptions;
    const tags = [];

    const result = await service.parse(
      instance as unknown as UnknownWebsite,
      defaultOptions,
      websiteOptions,
    );

    expect(result).toEqual(tags);
  });

  it('should parse tags with no tag support and return empty', async () => {
    const instance = {
      decoratedProps: {
        tagSupport: {
          supportsTags: false,
          maxTags: Infinity,
        },
      },
    };
    const defaultOptions: IWebsiteOptions = {
      data: {
        tags: {
          tags: ['default'],
        },
      },
    } as IWebsiteOptions;
    const websiteOptions: IWebsiteOptions = {
      data: {
        tags: {
          tags: ['website'],
        },
      },
    } as IWebsiteOptions;
    const tags = [];

    const result = await service.parse(
      instance as unknown as UnknownWebsite,
      defaultOptions,
      websiteOptions,
    );

    expect(result).toEqual(tags);
  });

  it('should parse tags with custom instance tag parser', async () => {
    const instance = {
      decoratedProps: {
        tagSupport: {
          supportsTags: true,
          maxTags: Infinity,
        },
        tagParser: (tag: string) => tag.toUpperCase(),
      },
    };
    const defaultOptions: IWebsiteOptions = {
      data: {
        tags: {
          tags: ['default'],
        },
      },
    } as IWebsiteOptions;
    const websiteOptions: IWebsiteOptions = {
      data: {
        tags: {
          tags: ['website'],
        },
      },
    } as IWebsiteOptions;
    const tags = [
      ...defaultOptions.data.tags.tags,
      ...websiteOptions.data.tags.tags,
    ].map((tag) => tag.toUpperCase());

    const result = await service.parse(
      instance as unknown as UnknownWebsite,
      defaultOptions,
      websiteOptions,
    );

    expect(result).toEqual(tags);
  });

  it('should truncate tags to maxTags', async () => {
    const instance = {
      decoratedProps: {
        tagSupport: {
          supportsTags: true,
          maxTags: 1,
        },
      },
    };
    const defaultOptions: IWebsiteOptions = {
      data: {
        tags: {
          tags: ['default', 'default2'],
        },
      },
    } as IWebsiteOptions;
    const websiteOptions: IWebsiteOptions = {
      data: {
        tags: {
          tags: ['website', 'website2'],
        },
      },
    } as IWebsiteOptions;
    const tags = [defaultOptions.data.tags.tags[0]];

    const result = await service.parse(
      instance as unknown as UnknownWebsite,
      defaultOptions,
      websiteOptions,
    );

    expect(result).toEqual(tags);
  });
});
