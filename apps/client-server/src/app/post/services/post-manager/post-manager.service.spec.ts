import { Test, TestingModule } from '@nestjs/testing';
import { clearDatabase } from '@postybirb/database';
import { PostyBirbDirectories, writeSync } from '@postybirb/fs';
import {
  AccountId,
  DefaultDescription,
  PostRecordResumeMode,
  PostRecordState,
  SubmissionId,
  SubmissionRating,
  SubmissionType,
} from '@postybirb/types';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  AccountModule
} from '../../../account/account.module';
import { AccountService } from '../../../account/account.service';
import { CreateAccountDto } from '../../../account/dtos/create-account.dto';
import { PostyBirbDatabase } from '../../../drizzle/postybirb-database/postybirb-database';
import { FileConverterModule } from '../../../file-converter/file-converter.module';
import { FileConverterService } from '../../../file-converter/file-converter.service';
import { MulterFileInfo } from '../../../file/models/multer-file-info';
import { NotificationsModule } from '../../../notifications/notifications.module';
import { PostParsersModule } from '../../../post-parsers/post-parsers.module';
import { SettingsService } from '../../../settings/settings.service';
import { CreateSubmissionDto } from '../../../submission/dtos/create-submission.dto';
import { SubmissionService } from '../../../submission/services/submission.service';
import { SubmissionModule } from '../../../submission/submission.module';
import { UserSpecifiedWebsiteOptionsModule } from '../../../user-specified-website-options/user-specified-website-options.module';
import { ValidationService } from '../../../validation/validation.service';
import { CreateWebsiteOptionsDto } from '../../../website-options/dtos/create-website-options.dto';
import { WebsiteOptionsModule } from '../../../website-options/website-options.module';
import { WebsiteOptionsService } from '../../../website-options/website-options.service';
import { WebsiteRegistryService } from '../../../websites/website-registry.service';
import { WebsitesModule } from '../../../websites/websites.module';
import { PostFileResizerService } from '../post-file-resizer/post-file-resizer.service';
import { PostManagerService } from './post-manager.service';

describe('PostManagerService', () => {
  let service: PostManagerService;
  let module: TestingModule;
  let submissionService: SubmissionService;
  let accountService: AccountService;
  let websiteOptionsService: WebsiteOptionsService;
  let registryService: WebsiteRegistryService;
  let testFile: Buffer | null = null;
  let postRecordRepository: PostyBirbDatabase<'PostRecordSchema'>;

  beforeAll(() => {
    testFile = readFileSync(
      join(__dirname, '../../../../test-files/small_image.jpg'),
    );
  });

  beforeEach(async () => {
    try {
      clearDatabase();
      module = await Test.createTestingModule({
        imports: [
          SubmissionModule,
          AccountModule,
          WebsiteOptionsModule,
          WebsitesModule,
          UserSpecifiedWebsiteOptionsModule,
          PostParsersModule,
          FileConverterModule,
          NotificationsModule,
        ],
        providers: [
          PostManagerService,
          PostFileResizerService,
          ValidationService,
          FileConverterService,
        ],
      }).compile();

      postRecordRepository = new PostyBirbDatabase('PostRecordSchema');
      service = module.get<PostManagerService>(PostManagerService);
      submissionService = module.get<SubmissionService>(SubmissionService);
      accountService = module.get<AccountService>(AccountService);
      const settingsService = module.get<SettingsService>(SettingsService);
      websiteOptionsService = module.get<WebsiteOptionsService>(
        WebsiteOptionsService,
      );
      registryService = module.get<WebsiteRegistryService>(
        WebsiteRegistryService,
      );
      await accountService.onModuleInit();
      await settingsService.onModuleInit();
    } catch (err) {
      console.log(err);
    }
  });

  function setup(): string {
    const path = `${PostyBirbDirectories.DATA_DIRECTORY}/${Date.now()}.jpg`;
    writeSync(path, testFile);
    return path;
  }

  async function createAccount() {
    const dto = new CreateAccountDto();
    dto.groups = ['test'];
    dto.name = 'test';
    dto.website = 'test';

    const record = await accountService.create(dto);
    return record;
  }

  function createSubmissionDto(): CreateSubmissionDto {
    const dto = new CreateSubmissionDto();
    dto.name = 'Test';
    dto.type = SubmissionType.MESSAGE;
    return dto;
  }

  function createMulterData(path: string): MulterFileInfo {
    return {
      fieldname: 'file',
      originalname: 'small_image.jpg',
      encoding: '',
      mimetype: 'image/jpeg',
      size: testFile.length,
      destination: '',
      filename: 'small_image.jpg',
      path,
      origin: undefined,
    };
  }

  function createWebsiteOptionsDto(
    submissionId: SubmissionId,
    accountId: AccountId,
  ): CreateWebsiteOptionsDto {
    const dto = new CreateWebsiteOptionsDto();
    dto.submissionId = submissionId;
    dto.accountId = accountId;
    dto.data = {
      title: 'Test Title',
      tags: {
        overrideDefault: true,
        tags: ['test'],
      },
      description: {
        overrideDefault: true,
        description: DefaultDescription(),
      },
      rating: SubmissionRating.GENERAL,
    };
    return dto;
  }

  afterAll(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should handle file submissions', async () => {
    const createDto = createSubmissionDto();
    createDto.type = SubmissionType.FILE;
    const path = setup();
    const fileInfo = createMulterData(path);

    const record = await submissionService.create(createDto, fileInfo);
    const account = await createAccount();
    const createOptionsDto = createWebsiteOptionsDto(record.id, account.id);
    await websiteOptionsService.create(createOptionsDto);

    const insertedRecord = await postRecordRepository.insert({
      submissionId: record.id,
      resumeMode: PostRecordResumeMode.CONTINUE,
      state: PostRecordState.PENDING,
    });

    const postRecord = await postRecordRepository.findById(
      insertedRecord.id,
      undefined,
      {
        children: true,
        submission: {
          with: {
            options: {
              with: {
                account: true,
              },
            },
            files: true,
          },
        },
      },
    );

    await service.startPost(postRecord);

    const postRecordAfterPosting = await postRecordRepository.findById(
      insertedRecord.id,
      undefined,
      {
        children: true,
      },
    );
    expect(postRecordAfterPosting.state).toBe(PostRecordState.DONE);
    expect(postRecordAfterPosting.completedAt).toBeDefined();
    expect(postRecordAfterPosting.children).toHaveLength(1);

    const websitePostRecord = postRecordAfterPosting.children[0];
    expect(websitePostRecord).toBeDefined();
    expect(websitePostRecord.errors).toHaveLength(0);
    expect(websitePostRecord.postData).toBeDefined();
    expect(websitePostRecord.postResponse).toBeDefined();
    expect(websitePostRecord.postResponse[0].message).toBeDefined();
  });

  it('should handle file submission failure', async () => {
    const createDto = createSubmissionDto();
    delete createDto.name; // To ensure file name check
    createDto.type = SubmissionType.FILE;
    const path = setup();
    const fileInfo = createMulterData(path);

    const record = await submissionService.create(createDto, fileInfo);
    const account = await createAccount();
    const createOptionsDto = createWebsiteOptionsDto(record.id, account.id);
    await websiteOptionsService.create(createOptionsDto);

    const insertedRecord = await postRecordRepository.insert({
      submissionId: record.id,
      resumeMode: PostRecordResumeMode.CONTINUE,
      state: PostRecordState.PENDING,
    });

    const postRecord = await postRecordRepository.findById(
      insertedRecord.id,
      undefined,
      {
        children: true,
        submission: {
          with: {
            options: {
              with: {
                account: true,
              },
            },
            files: true,
          },
        },
      },
    );

    const startPostPromise = service.startPost(postRecord);
    // This cancellation will largely be immediate
    service.cancelIfRunning(record.id);
    await startPostPromise;

    const postRecordAfterPosting = await postRecordRepository.findById(
      insertedRecord.id,
      undefined,
      {
        children: true,
      },
    );
    expect(postRecordAfterPosting.state).toBe(PostRecordState.FAILED);
    expect(postRecordAfterPosting.completedAt).toBeDefined();
    expect(postRecordAfterPosting.children).toHaveLength(1);

    const websitePostRecord = postRecordAfterPosting.children[0];
    expect(websitePostRecord).toBeDefined();
    expect(websitePostRecord.errors).toHaveLength(0);
  });

  it('should handle message submission', async () => {
    const createDto = createSubmissionDto();

    const record = await submissionService.create(createDto);
    const account = await createAccount();
    const createOptionsDto = createWebsiteOptionsDto(record.id, account.id);
    await websiteOptionsService.create(createOptionsDto);

    const insertedRecord = await postRecordRepository.insert({
      submissionId: record.id,
      resumeMode: PostRecordResumeMode.CONTINUE,
      state: PostRecordState.PENDING,
    });

    const postRecord = await postRecordRepository.findById(
      insertedRecord.id,
      undefined,
      {
        children: true,
        submission: {
          with: {
            options: {
              with: {
                account: true,
              },
            },
            files: true,
          },
        },
      },
    );

    await service.startPost(postRecord);

    const postRecordAfterPosting = await postRecordRepository.findById(
      insertedRecord.id,
      undefined,
      {
        children: true,
      },
    );
    expect(postRecordAfterPosting.state).toBe(PostRecordState.DONE);
    expect(postRecordAfterPosting.completedAt).toBeDefined();
    expect(postRecordAfterPosting.children).toHaveLength(1);

    const websitePostRecord = postRecordAfterPosting.children[0];
    expect(websitePostRecord).toBeDefined();
    expect(websitePostRecord.errors).toHaveLength(0);
    expect(websitePostRecord.postData).toBeDefined();
    expect(websitePostRecord.postResponse).toBeDefined();
    expect(websitePostRecord.postResponse[0].message).toBeDefined();
  });
});
