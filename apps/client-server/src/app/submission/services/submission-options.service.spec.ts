import { Test, TestingModule } from '@nestjs/testing';
import { AccountService } from '../../account/account.service';
import { DatabaseModule } from '../../database/database.module';
import { FileService } from '../../file/file.service';
import { websiteImplementationProvider } from '../../websites/implementations';
import { WebsiteRegistryService } from '../../websites/website-registry.service';
import { FileSubmissionService } from './file-submission.service';
import { MessageSubmissionService } from './message-submission.service';
import { SubmissionOptionsService } from './submission-options.service';
import { SubmissionService } from './submission.service';

describe('SubmissionPartService', () => {
  let service: SubmissionOptionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [DatabaseModule],
      providers: [
        SubmissionService,
        FileService,
        SubmissionService,
        FileSubmissionService,
        MessageSubmissionService,
        AccountService,
        WebsiteRegistryService,
        SubmissionOptionsService,
        websiteImplementationProvider,
      ],
    }).compile();

    service = module.get<SubmissionOptionsService>(SubmissionOptionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
