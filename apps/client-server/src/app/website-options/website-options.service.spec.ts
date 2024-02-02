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
import { CreateFileService } from '../file/services/create-file.service';
import { UpdateFileService } from '../file/services/update-file.service';
import { CreateSubmissionDto } from '../submission/dtos/create-submission.dto';
import { FileSubmissionService } from '../submission/services/file-submission.service';
import { MessageSubmissionService } from '../submission/services/message-submission.service';
import { SubmissionService } from '../submission/services/submission.service';
import { UserSpecifiedWebsiteOptionsService } from '../user-specified-website-options/user-specified-website-options.service';
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
        CreateFileService,
        UpdateFileService,
        FileService,
        SubmissionService,
        FileSubmissionService,
        MessageSubmissionService,
        AccountService,
        WebsiteRegistryService,
        WebsiteOptionsService,
        WebsiteImplProvider,
        UserSpecifiedWebsiteOptionsService,
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
    await accountService.onModuleInit();
  });

  afterAll(async () => {
    await orm.close(true);
    await module.close();
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
    dto.account = account.id;
    dto.submission = submission.id;

    const record = await service.create(dto);
    const groups = await service.findAll();
    expect(groups).toHaveLength(2); // 2 because default

    expect(groups[1].account.id).toEqual(dto.account);
    expect(groups[1].isDefault).toEqual(false);
    expect(groups[1].data).toEqual(dto.data);
    expect(groups[1].submission.id).toEqual(dto.submission);

    expect(record.toJSON()).toEqual({
      data: record.data,
      isDefault: false,
      id: record.id,
      account: account.id,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    });
  });

  it('should remove entity', async () => {
    const account = await createAccount();
    const submission = await createSubmission();

    const dto = new CreateWebsiteOptionsDto<IWebsiteFormFields>();
    dto.data = {
      title: 'title',
      tags: DefaultTagValue,
      description: DefaultDescriptionValue,
      rating: SubmissionRating.GENERAL,
    };
    dto.account = account.id;
    dto.submission = submission.id;

    const record = await service.create(dto);
    expect(await service.findAll()).toHaveLength(2); // 2 because default

    await service.remove(record.id);
    expect(await service.findAll()).toHaveLength(1);
  });

  it('should remove entity when parent is removed', async () => {
    const account = await createAccount();
    const submission = await createSubmission();

    const dto = new CreateWebsiteOptionsDto<IWebsiteFormFields>();
    dto.data = {
      title: 'title',
      tags: DefaultTagValue,
      description: DefaultDescriptionValue,
      rating: SubmissionRating.GENERAL,
    };
    dto.account = account.id;
    dto.submission = submission.id;

    await service.create(dto);
    expect(await service.findAll()).toHaveLength(2); // 2 because default

    await submissionService.remove(submission.id);
    expect(await service.findAll()).toHaveLength(0);
  });

  it('should update entity', async () => {
    const account = await createAccount();
    const submission = await createSubmission();

    const dto = new CreateWebsiteOptionsDto<IWebsiteFormFields>();
    dto.data = {
      title: 'title',
      tags: DefaultTagValue,
      description: DefaultDescriptionValue,
      rating: SubmissionRating.GENERAL,
    };
    dto.account = account.id;
    dto.submission = submission.id;

    const record = await service.create(dto);
    expect(record.account.id).toEqual(dto.account);
    expect(record.isDefault).toEqual(false);
    expect(record.data).toEqual(dto.data);
    expect(record.submission.id).toEqual(dto.submission);

    const update = await service.update(record.id, {
      data: {
        title: 'title updated',
        tags: DefaultTagValue,
        description: DefaultDescriptionValue,
        rating: SubmissionRating.GENERAL,
      },
    });

    expect(update.data.title).toEqual('title updated');
  });
});
