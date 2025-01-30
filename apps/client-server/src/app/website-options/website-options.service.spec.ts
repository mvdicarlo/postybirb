import { Test, TestingModule } from '@nestjs/testing';
import { clearDatabase } from '@postybirb/database';
import {
  DefaultDescriptionValue,
  DefaultTagValue,
  IWebsiteFormFields,
  SubmissionRating,
  SubmissionType,
} from '@postybirb/types';
import { AccountModule } from '../account/account.module';
import { AccountService } from '../account/account.service';
import { CreateAccountDto } from '../account/dtos/create-account.dto';
import { FileConverterService } from '../file-converter/file-converter.service';
import { FileService } from '../file/file.service';
import { CreateFileService } from '../file/services/create-file.service';
import { UpdateFileService } from '../file/services/update-file.service';
import { FormGeneratorModule } from '../form-generator/form-generator.module';
import { PostParsersModule } from '../post-parsers/post-parsers.module';
import { CreateSubmissionDto } from '../submission/dtos/create-submission.dto';
import { FileSubmissionService } from '../submission/services/file-submission.service';
import { MessageSubmissionService } from '../submission/services/message-submission.service';
import { SubmissionService } from '../submission/services/submission.service';
import { UserSpecifiedWebsiteOptionsModule } from '../user-specified-website-options/user-specified-website-options.module';
import { UserSpecifiedWebsiteOptionsService } from '../user-specified-website-options/user-specified-website-options.service';
import { ValidationService } from '../validation/validation.service';
import { WebsiteImplProvider } from '../websites/implementations/provider';
import { WebsiteRegistryService } from '../websites/website-registry.service';
import { WebsitesModule } from '../websites/websites.module';
import { CreateWebsiteOptionsDto } from './dtos/create-website-options.dto';
import { WebsiteOptionsService } from './website-options.service';

describe('WebsiteOptionsService', () => {
  let service: WebsiteOptionsService;
  let submissionService: SubmissionService;
  let accountService: AccountService;
  let module: TestingModule;

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
    clearDatabase();
    try {
      module = await Test.createTestingModule({
        imports: [
          WebsitesModule,
          AccountModule,
          UserSpecifiedWebsiteOptionsModule,
          PostParsersModule,
          FormGeneratorModule,
        ],
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
          ValidationService,
          WebsiteOptionsService,
          WebsiteImplProvider,
          UserSpecifiedWebsiteOptionsService,
          FileConverterService,
        ],
      }).compile();

      service = module.get<WebsiteOptionsService>(WebsiteOptionsService);
      submissionService = module.get<SubmissionService>(SubmissionService);
      accountService = module.get<AccountService>(AccountService);
      await accountService.onModuleInit();
    } catch (e) {
      console.error(e);
    }
  });

  afterAll(async () => {
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
      tags: DefaultTagValue(),
      description: DefaultDescriptionValue(),
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

    expect(record.toDTO()).toEqual({
      data: record.data,
      isDefault: false,
      id: record.id,
      accountId: account.id,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      account: record.account.toObject(),
      submissionId: submission.id,
      submission: record.submission.toDTO(),
    });
  });

  it('should remove entity', async () => {
    const account = await createAccount();
    const submission = await createSubmission();

    const dto = new CreateWebsiteOptionsDto<IWebsiteFormFields>();
    dto.data = {
      title: 'title',
      tags: DefaultTagValue(),
      description: DefaultDescriptionValue(),
      rating: SubmissionRating.GENERAL,
    };
    dto.accountId = account.id;
    dto.submissionId = submission.id;

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
      tags: DefaultTagValue(),
      description: DefaultDescriptionValue(),
      rating: SubmissionRating.GENERAL,
    };
    dto.accountId = account.id;
    dto.submissionId = submission.id;

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
      tags: DefaultTagValue(),
      description: DefaultDescriptionValue(),
      rating: SubmissionRating.GENERAL,
    };
    dto.accountId = account.id;
    dto.submissionId = submission.id;

    const record = await service.create(dto);
    expect(record.account.id).toEqual(dto.accountId);
    expect(record.isDefault).toEqual(false);
    expect(record.data).toEqual(dto.data);
    expect(record.submission.id).toEqual(dto.submissionId);

    const update = await service.update(record.id, {
      data: {
        title: 'title updated',
        tags: DefaultTagValue(),
        description: DefaultDescriptionValue(),
        rating: SubmissionRating.GENERAL,
      },
    });

    expect(update.data.title).toEqual('title updated');
  });
});
