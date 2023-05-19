import { MikroORM } from '@mikro-orm/core';
import { Test, TestingModule } from '@nestjs/testing';
import {
  DefaultDescriptionValue,
  DefaultTagValue,
  IWebsiteFormFields,
  SubmissionRating,
  SubmissionType,
} from '@postybirb/types';
import { AccountService } from '../account/account.service';
import { CreateAccountDto } from '../account/dtos/create-account.dto';
import { DatabaseModule } from '../database/database.module';
import { FileService } from '../file/file.service';
import { CreateSubmissionDto } from '../submission/dtos/create-submission.dto';
import { FileSubmissionService } from '../submission/services/file-submission.service';
import { MessageSubmissionService } from '../submission/services/message-submission.service';
import { SubmissionService } from '../submission/services/submission.service';
import { WebsiteImplProvider } from '../websites/implementations';
import { WebsiteRegistryService } from '../websites/website-registry.service';
import { CreateWebsiteOptionsDto } from './dtos/create-website-options.dto';
import { WebsiteOptionsService } from './website-options.service';

describe('WebsiteOptionsService', () => {
  let service: WebsiteOptionsService;
  let submissionService: SubmissionService;
  let accountService: AccountService;
  let module: TestingModule;
  let orm: MikroORM;

  async function createAccount() {
    const dto = new CreateAccountDto();
    dto.groups = ['test'];
    dto.name = 'test';
    dto.website = 'test';

    const record = await accountService.create(dto);
    return record;
  }

  async function createSubmission() {
    const dto = new CreateSubmissionDto();
    dto.name = 'test';
    dto.type = SubmissionType.MESSAGE;

    const record = await submissionService.create(dto);
    return record;
  }

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [DatabaseModule],
      providers: [
        SubmissionService,
        FileService,
        SubmissionService,
        FileSubmissionService,
        MessageSubmissionService,
        AccountService,
        WebsiteRegistryService,
        WebsiteOptionsService,
        WebsiteImplProvider,
      ],
    }).compile();

    service = module.get<WebsiteOptionsService>(WebsiteOptionsService);
    submissionService = module.get<SubmissionService>(SubmissionService);
    accountService = module.get<AccountService>(AccountService);
    orm = module.get(MikroORM);
    try {
      await orm.getSchemaGenerator().refreshDatabase();
    } catch {
      // none
    }
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create entity', async () => {
    const account = await createAccount();
    const submission = await createSubmission();

    const dto = new CreateWebsiteOptionsDto<IWebsiteFormFields>();
    dto.data = {
      title: 'title',
      tags: DefaultTagValue,
      description: DefaultDescriptionValue,
      rating: SubmissionRating.GENERAL,
    };
    dto.accountId = account.id;
    dto.submissionId = submission.id;

    const record = await service.create(dto);
    const groups = await service.findAll();
    expect(groups).toHaveLength(2); // 2 because default

    expect(groups[1].account.id).toEqual(dto.accountId);
    expect(groups[1].isDefault).toEqual(false);
    expect(groups[1].data).toEqual(dto.data);
    expect(groups[1].submission.id).toEqual(dto.submissionId);

    expect(record.toJSON()).toEqual({
      data: record.data,
      isDefault: false,
      id: record.id,
      account: {
        createdAt: account.createdAt.toISOString(),
        data: {
          test: 'test-mode',
        },
        groups: ['test'],
        id: account.id,
        name: 'test',
        state: {
          isLoggedIn: true,
          pending: false,
          username: 'TestUser',
        },
        updatedAt: account.createdAt.toISOString(),
        website: 'test',
        websiteInfo: {
          supports: ['MESSAGE', 'FILE'],
          websiteDisplayName: 'Test',
        },
      },
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    });
  });
});
