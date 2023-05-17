import { Test, TestingModule } from '@nestjs/testing';
import { AccountService } from '../account/account.service';
import { DatabaseModule } from '../database/database.module';
import { FileService } from '../file/file.service';
import { WebsiteImplProvider } from '../websites/implementations';
import { WebsiteRegistryService } from '../websites/website-registry.service';
import { FileSubmissionService } from '../submission/services/file-submission.service';
import { MessageSubmissionService } from '../submission/services/message-submission.service';
import { SubmissionOptionsService } from './submission-options.service';
import { SubmissionService } from '../submission/services/submission.service';

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
        WebsiteImplProvider,
      ],
    }).compile();

    service = module.get<SubmissionOptionsService>(SubmissionOptionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
