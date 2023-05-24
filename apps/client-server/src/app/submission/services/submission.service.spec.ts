import { Test, TestingModule } from '@nestjs/testing';
import { AccountService } from '../../account/account.service';
import { DatabaseModule } from '../../database/database.module';
import { FileService } from '../../file/file.service';
import { CreateFileService } from '../../file/services/create-file.service';
import { UpdateFileService } from '../../file/services/update-file.service';
import { WebsiteOptionsService } from '../../website-options/website-options.service';
import { WebsiteImplProvider } from '../../websites/implementations';
import { WebsiteRegistryService } from '../../websites/website-registry.service';
import { FileSubmissionService } from './file-submission.service';
import { MessageSubmissionService } from './message-submission.service';
import { SubmissionService } from './submission.service';

describe('SubmissionService', () => {
  let service: SubmissionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [DatabaseModule],
      providers: [
        SubmissionService,
        CreateFileService,
        UpdateFileService,
        FileService,
        FileSubmissionService,
        MessageSubmissionService,
        AccountService,
        WebsiteRegistryService,
        WebsiteOptionsService,
        WebsiteImplProvider,
      ],
    }).compile();

    service = module.get<SubmissionService>(SubmissionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
