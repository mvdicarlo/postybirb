import { Test, TestingModule } from '@nestjs/testing';
import { clearDatabase } from '@postybirb/database';
import { FileType, SubmissionType } from '@postybirb/types';
import { FileConverterService } from '../file-converter/file-converter.service';
import { FileModule } from '../file/file.module';
import { FileService } from '../file/file.service';
import { CreateFileService } from '../file/services/create-file.service';
import { UpdateFileService } from '../file/services/update-file.service';
import { SharpInstanceManager } from '../image-processing/sharp-instance-manager';
import { TestPlatformModule } from '../platform/testing/test-platform.module';
import { PostParsersModule } from '../post-parsers/post-parsers.module';
import { PostParsersService } from '../post-parsers/post-parsers.service';
import { WebsiteImplProvider } from '../websites/implementations/provider';
import { WebsiteRegistryService } from '../websites/website-registry.service';
import { WebsitesModule } from '../websites/websites.module';
import { ValidationService } from './validation.service';

describe('ValidationService', () => {
  let service: ValidationService;

  beforeEach(async () => {
    clearDatabase();
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        TestPlatformModule,
        WebsitesModule,
        PostParsersModule,
        FileModule,
      ],
      providers: [
        WebsiteImplProvider,
        ValidationService,
        WebsiteRegistryService,
        PostParsersService,
        FileConverterService,
        FileService,
        CreateFileService,
        UpdateFileService,
        SharpInstanceManager,
      ],
    }).compile();

    service = module.get<ValidationService>(ValidationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('filters unsupported files before website-specific validation', async () => {
    const onValidateFileSubmission = jest.fn().mockResolvedValue({
      warnings: [],
      errors: [],
    });
    const website = {
      accountId: 'account',
      supportsFile: true,
      account: { toDTO: jest.fn().mockReturnValue({}) },
      decoratedProps: {
        fileOptions: { supportedFileTypes: [FileType.IMAGE] },
      },
      onValidateFileSubmission,
    };
    const submission = {
      id: 'submission',
      type: SubmissionType.FILE,
      files: [
        {
          id: 'image',
          fileName: 'image.png',
          metadata: { ignoredWebsites: [] },
        },
        {
          id: 'video',
          fileName: 'video.mp4',
          metadata: { ignoredWebsites: [] },
        },
        {
          id: 'ignored',
          fileName: 'ignored.png',
          metadata: { ignoredWebsites: ['account'] },
        },
      ],
    };
    const validateWebsiteInstance = (
      service as unknown as {
        validateWebsiteInstance: (
          websiteId: string,
          targetSubmission: unknown,
          targetWebsite: unknown,
          postData: unknown,
        ) => Promise<unknown>;
      }
    ).validateWebsiteInstance.bind(service);

    await validateWebsiteInstance('option', submission, website, {
      submission,
      options: {},
    });

    const [postData] = onValidateFileSubmission.mock.calls[0];
    expect(
      postData.submission.files.map((file: { id: string }) => file.id),
    ).toEqual(['image']);
  });
});
