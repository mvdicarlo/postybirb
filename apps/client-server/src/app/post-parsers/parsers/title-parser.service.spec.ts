import { Test, TestingModule } from '@nestjs/testing';
import { IWebsiteOptions } from '@postybirb/types';
import { Submission } from '../../database/entities';
import { FormGeneratorService } from '../../form-generator/form-generator.service';
import { TitleParserService } from './title-parser.service';

describe('TitleParserService', () => {
  let module: TestingModule;
  let service: TitleParserService;
  let formGeneratorService: FormGeneratorService;
  let WebsiteInstanceMock: jest.Mock;

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
    formGeneratorService = module.get(FormGeneratorService);
    WebsiteInstanceMock = jest.fn().mockImplementation(() => ({}));
  });

  afterAll(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should parse title', async () => {
    const submission = new Submission({});
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
    const defaultForm = { title: [{ maxLength: Infinity }] };
    const websiteForm = { title: [{ maxLength: Infinity }] };
    (formGeneratorService.getDefaultForm as jest.Mock).mockResolvedValue(
      defaultForm,
    );
    (formGeneratorService.generateForm as jest.Mock).mockResolvedValue(
      websiteForm,
    );

    const title = await service.parse(
      submission,
      new WebsiteInstanceMock(),
      defaultOptions,
      websiteOptions,
    );

    expect(title).toBe('website');
  });

  it('should parse title with no website options', async () => {
    const submission = new Submission({});
    const instance = new WebsiteInstanceMock();
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
    const defaultForm = { title: { maxLength: 10 } };
    const websiteForm = { title: { maxLength: 5 } };
    (formGeneratorService.getDefaultForm as jest.Mock).mockResolvedValue(
      defaultForm,
    );
    (formGeneratorService.generateForm as jest.Mock).mockResolvedValue(
      websiteForm,
    );

    const title = await service.parse(
      submission,
      instance,
      defaultOptions,
      websiteOptions,
    );

    // Title should be truncated
    expect(title).toBe('defau');
  });

  it('should parse title and use default form if website form is not available', async () => {
    const submission = new Submission({});
    const instance = new WebsiteInstanceMock();
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
    const defaultForm = { title: [{ maxLength: 10 }] };
    (formGeneratorService.getDefaultForm as jest.Mock).mockResolvedValue(
      defaultForm,
    );
    (formGeneratorService.generateForm as jest.Mock).mockResolvedValue(null);

    const title = await service.parse(
      submission,
      instance,
      defaultOptions,
      websiteOptions,
    );

    expect(title).toBe('website');
  });
});
