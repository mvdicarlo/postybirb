/* eslint-disable max-classes-per-file */
import { Test, TestingModule } from '@nestjs/testing';
import { clearDatabase } from '@postybirb/database';
import { TagField } from '@postybirb/form-builder';
import { IWebsiteOptions, TagValue } from '@postybirb/types';
import { TagConvertersService } from '../../tag-converters/tag-converters.service';
import { BaseWebsiteOptions } from '../../websites/models/base-website-options';
import { DefaultWebsiteOptions } from '../../websites/models/default-website-options';
import { UnknownWebsite } from '../../websites/website';
import { TagParserService } from './tag-parser.service';

describe('TagParserService', () => {
  let module: TestingModule;
  let service: TagParserService;

  beforeEach(async () => {
    clearDatabase();
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
    const instance = {};
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
      ...websiteOptions.data.tags.tags,
      ...defaultOptions.data.tags.tags,
    ];
    const result = await service.parse(
      instance as unknown as UnknownWebsite,
      new DefaultWebsiteOptions(defaultOptions.data),
      new BaseWebsiteOptions(websiteOptions.data),
    );

    expect(result).toEqual(tags);
  });

  it('should parse tags with default tags override', async () => {
    const instance = {};
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
      new DefaultWebsiteOptions(defaultOptions.data),
      new BaseWebsiteOptions(websiteOptions.data),
    );

    expect(result).toEqual(tags);
  });

  it('should parse tags with no website options', async () => {
    const instance = {};
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
      new DefaultWebsiteOptions(defaultOptions.data),
      new BaseWebsiteOptions(websiteOptions.data),
    );

    expect(result).toEqual(tags);
  });

  it('should parse tags with no website options and no default tags', async () => {
    const instance = {};
    const defaultOptions: IWebsiteOptions = {
      data: {},
    } as IWebsiteOptions;
    const websiteOptions: IWebsiteOptions = {
      data: {},
    } as IWebsiteOptions;
    const tags = [];

    const result = await service.parse(
      instance as unknown as UnknownWebsite,
      new DefaultWebsiteOptions(defaultOptions.data),
      new BaseWebsiteOptions(websiteOptions.data),
    );

    expect(result).toEqual(tags);
  });

  it('should parse tags with no tag support and return empty', async () => {
    const instance = {};
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
    class TagOptions extends BaseWebsiteOptions {
      @TagField({ hidden: true })
      tags: TagValue;
    }
    const result = await service.parse(
      instance as unknown as UnknownWebsite,
      new DefaultWebsiteOptions(defaultOptions.data),
      new TagOptions(websiteOptions.data),
    );

    expect(result).toEqual(tags);
  });

  it('should parse tags with custom instance tag parser', async () => {
    const instance = {};
    class TagOptions extends BaseWebsiteOptions {
      @TagField({})
      tags: TagValue;

      protected processTag(tag: string): string {
        return tag.toUpperCase();
      }
    }
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
      ...websiteOptions.data.tags.tags,
      ...defaultOptions.data.tags.tags,
    ].map((tag) => tag.toUpperCase());

    const result = await service.parse(
      instance as unknown as UnknownWebsite,
      new DefaultWebsiteOptions(defaultOptions.data),
      new TagOptions(websiteOptions.data),
    );

    expect(result).toEqual(tags);
  });

  it('should truncate tags to maxTags', async () => {
    const instance = {};
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
    const tags = [websiteOptions.data.tags.tags[0]];
    class TagOptions extends BaseWebsiteOptions {
      @TagField({ maxTags: 1 })
      tags: TagValue;
    }
    const result = await service.parse(
      instance as unknown as UnknownWebsite,
      new DefaultWebsiteOptions(defaultOptions.data),
      new TagOptions(websiteOptions.data),
    );

    expect(result).toEqual(tags);
  });
});
