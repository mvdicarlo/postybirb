import { Test, TestingModule } from '@nestjs/testing';
import { AccountService } from '../../account/account.service';
import { Account } from '../../account/entities/account.entity';
import { AccountProvider } from '../../account/providers/account.provider';
import { getTestDatabaseProvider } from '../../database/typeorm.providers';
import { FileData } from '../../file/entities/file-data.entity';
import { File } from '../../file/entities/file.entity';
import { FileService } from '../../file/file.service';
import { FileDataProvider } from '../../file/providers/file-data.provider';
import { FileProvider } from '../../file/providers/file.provider';
import { WebsiteData } from '../../websites/entities/website-data.entity';
import { websiteImplementationProvider } from '../../websites/implementations';
import { WebsiteDataProvider } from '../../websites/providers/website-data.provider';
import { WebsiteRegistryService } from '../../websites/website-registry.service';
import { SubmissionPart } from '../entities/submission-part.entity';
import { Submission } from '../entities/submission.entity';
import { SubmissionPartProvider } from '../providers/submission-part.provider';
import { SubmissionProvider } from '../providers/submission.provider';
import { FileSubmissionService } from './file-submission.service';
import { MessageSubmissionService } from './message-submission.service';
import { SubmissionOptionsService } from './submission-options.service';
import { SubmissionService } from './submission.service';

describe('SubmissionPartService', () => {
  let service: SubmissionOptionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        getTestDatabaseProvider([
          Submission,
          SubmissionPart,
          Account,
          WebsiteData,
          File,
          FileData,
        ]),
        FileProvider,
        FileDataProvider,
        AccountProvider,
        WebsiteDataProvider,
        SubmissionProvider,
        SubmissionPartProvider,
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
