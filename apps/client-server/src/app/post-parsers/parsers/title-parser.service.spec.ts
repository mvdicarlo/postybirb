/* eslint-disable max-classes-per-file */
import { Test, TestingModule } from '@nestjs/testing';
import { TextField } from '@postybirb/form-builder';
import { IWebsiteOptions } from '@postybirb/types';
import { FormGeneratorService } from '../../form-generator/form-generator.service';
import { BaseWebsiteOptions } from '../../websites/models/base-website-options';
import { DefaultWebsiteOptions } from '../../websites/models/default-website-options';
import { TitleParserService } from './title-parser.service';

describe('TitleParserService', () => {
  let module: TestingModule;
  let service: TitleParserService;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        TitleParserService,
        {
          provide: FormGeneratorService,
          useValue: {
            getDefaultForm: jest.fn(),
            generateForm: jest.fn(),
          },
        },
      ],
    }).compile();
    service = module.get(TitleParserService);
  });

  afterAll(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should parse title', async () => {
    const defaultOptions: IWebsiteOptions = {
      id: 'default',
      data: {
        title: 'default',
      },
    } as IWebsiteOptions;
    const websiteOptions: IWebsiteOptions = {
      id: 'website',
      data: {
        title: 'website',
      },
    } as IWebsiteOptions;

    const title = await service.parse(
      new DefaultWebsiteOptions(defaultOptions.data),
      new BaseWebsiteOptions(websiteOptions.data),
    );

    expect(title).toBe('website');
  });

  it('should parse title with no website options', async () => {
    class TestWebsiteOptions extends BaseWebsiteOptions {
      @TextField({ label: 'title', maxLength: 5 })
      public title: string;
    }

    class TestDefaultWebsiteOptions extends DefaultWebsiteOptions {
      @TextField({ label: 'title', maxLength: 10 })
      public title: string;
    }

    const defaultOptions: IWebsiteOptions = {
      id: 'default',
      data: {
        title: 'default',
      },
    } as IWebsiteOptions;
    const websiteOptions: IWebsiteOptions = {
      id: 'website',
      data: {},
    } as IWebsiteOptions;

    const title = await service.parse(
      new TestDefaultWebsiteOptions(defaultOptions.data),
      new TestWebsiteOptions(websiteOptions.data),
    );

    // Title should be truncated
    expect(title).toBe('defau');
  });

  it('should parse title and use default form if website form is not available', async () => {
    const defaultOptions: IWebsiteOptions = {
      id: 'default',
      data: {
        title: 'default',
      },
    } as IWebsiteOptions;
    const websiteOptions: IWebsiteOptions = {
      id: 'website',
      data: {},
    } as IWebsiteOptions;

    const title = await service.parse(
      new DefaultWebsiteOptions(defaultOptions.data),
      new BaseWebsiteOptions(websiteOptions.data),
    );

    expect(title).toBe('default');
  });
});
