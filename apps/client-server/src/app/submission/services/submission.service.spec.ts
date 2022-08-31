import { Test, TestingModule } from '@nestjs/testing';
import { AccountService } from '../../account/account.service';
import { WebsiteRegistryService } from '../../websites/website-registry.service';
import { FileSubmissionService } from './file-submission.service';
import { MessageSubmissionService } from './message-submission.service';
import { SubmissionOptionsService } from './submission-options.service';
import { SubmissionService } from './submission.service';
import { FileService } from '../../file/file.service';
import { websiteImplementationProvider } from '../../websites/implementations';
import { DatabaseModule } from '../../database/database.module';

describe('SubmissionService', () => {
  let service: SubmissionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [DatabaseModule],
      providers: [
        SubmissionService,
        FileService,
        FileSubmissionService,
        MessageSubmissionService,
        AccountService,
        WebsiteRegistryService,
        SubmissionOptionsService,
        websiteImplementationProvider,
      ],
    }).compile();

    service = module.get<SubmissionService>(SubmissionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
