import { Test, TestingModule } from '@nestjs/testing';
import { clearDatabase } from '@postybirb/database';
import {
  AccountId,
  DefaultDescription,
  PostRecordState,
  SubmissionId,
  SubmissionRating,
  SubmissionType,
} from '@postybirb/types';
import { AccountModule } from '../../../account/account.module';
import { AccountService } from '../../../account/account.service';
import { CreateAccountDto } from '../../../account/dtos/create-account.dto';
import { PostyBirbDatabase } from '../../../drizzle/postybirb-database/postybirb-database';
import { SettingsService } from '../../../settings/settings.service';
import { CreateSubmissionDto } from '../../../submission/dtos/create-submission.dto';
import { SubmissionService } from '../../../submission/services/submission.service';
import { SubmissionModule } from '../../../submission/submission.module';
import { CreateWebsiteOptionsDto } from '../../../website-options/dtos/create-website-options.dto';
import { WebsiteOptionsModule } from '../../../website-options/website-options.module';
import { WebsiteOptionsService } from '../../../website-options/website-options.service';
import { WebsiteRegistryService } from '../../../websites/website-registry.service';
import { WebsitesModule } from '../../../websites/websites.module';
import { PostModule } from '../../post.module';
import { PostService } from '../../post.service';
import { PostManagerRegistry } from '../post-manager-v2';
import { PostQueueService } from './post-queue.service';

describe('PostQueueService', () => {
  let service: PostQueueService;
  let module: TestingModule;
  let submissionService: SubmissionService;
  let accountService: AccountService;
  let websiteOptionsService: WebsiteOptionsService;
  let registryService: WebsiteRegistryService;
  let postService: PostService;
  let mockPostManagerRegistry: jest.Mocked<PostManagerRegistry>;

  beforeEach(async () => {
    clearDatabase();

    // Create mock PostManagerRegistry
    mockPostManagerRegistry = {
      startPost: jest.fn().mockResolvedValue(undefined),
      cancelIfRunning: jest.fn().mockResolvedValue(true),
      isPostingType: jest.fn().mockReturnValue(false),
      getManager: jest.fn(),
    } as any;

    try {
      module = await Test.createTestingModule({
        imports: [
          SubmissionModule,
          AccountModule,
          WebsiteOptionsModule,
          WebsitesModule,
          PostModule,
        ],
      })
        .overrideProvider(PostManagerRegistry)
        .useValue(mockPostManagerRegistry)
        .compile();

      service = module.get<PostQueueService>(PostQueueService);
      submissionService = module.get<SubmissionService>(SubmissionService);
      accountService = module.get<AccountService>(AccountService);
      const settingsService = module.get<SettingsService>(SettingsService);
      websiteOptionsService = module.get<WebsiteOptionsService>(
        WebsiteOptionsService,
      );
      registryService = module.get<WebsiteRegistryService>(
        WebsiteRegistryService,
      );
      postService = module.get<PostService>(PostService);
      await accountService.onModuleInit();
      await settingsService.onModuleInit();
    } catch (err) {
      console.log(err);
    }
  });

  function createSubmissionDto(): CreateSubmissionDto {
    const dto = new CreateSubmissionDto();
    dto.name = 'Test';
    dto.type = SubmissionType.MESSAGE;
    return dto;
  }

  function createAccountDto(): CreateAccountDto {
    const dto = new CreateAccountDto();
    dto.name = 'Test';
    dto.website = 'test';
    return dto;
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

  it('should handle pausing and resuming the queue', async () => {
    await service.pause();
    expect(await service.isPaused()).toBe(true);
    await service.resume();
    expect(await service.isPaused()).toBe(false);
  });

  it('should handle enqueue and dequeue of submissions', async () => {
    await service.pause(); // Just to test the function
    const submission = await submissionService.create(createSubmissionDto());
    const account = await accountService.create(createAccountDto());
    expect(registryService.findInstance(account)).toBeDefined();

    await websiteOptionsService.create(
      createWebsiteOptionsDto(submission.id, account.id),
    );

    await service.enqueue([submission.id, submission.id]);
    expect((await service.findAll()).length).toBe(1);
    const top = await service.peek();
    expect(top).toBeDefined();
    expect(top.submission.id).toBe(submission.id);

    await service.dequeue([submission.id]);
    expect((await service.findAll()).length).toBe(0);
    expect(await service.peek()).toBeNull();
  });

  it('should insert posts into the post manager', async () => {
    const submission = await submissionService.create(createSubmissionDto());
    const account = await accountService.create(createAccountDto());
    expect(registryService.findInstance(account)).toBeDefined();

    await websiteOptionsService.create(
      createWebsiteOptionsDto(submission.id, account.id),
    );

    await service.enqueue([submission.id]);
    expect((await service.findAll()).length).toBe(1);

    // Initially, no manager is posting (so the post record will be created)
    mockPostManagerRegistry.isPostingType.mockReturnValue(false);

    // We expect the creation of a record and a start of the post manager
    await service.execute();
    let postRecord = (await postService.findAll())[0];
    let queueRecord = await service.peek();
    expect(postRecord).toBeDefined();
    expect(postRecord.submissionId).toBe(submission.id);
    expect(mockPostManagerRegistry.startPost).toHaveBeenCalledWith(
      expect.objectContaining({
        id: postRecord.id,
        submissionId: submission.id,
      }),
    );
    expect(queueRecord).toBeDefined();
    expect(queueRecord.postRecord).toBeDefined();

    // Now simulate that the manager is posting
    mockPostManagerRegistry.isPostingType.mockReturnValue(true);

    // Simulate cancellation
    await mockPostManagerRegistry.cancelIfRunning(submission.id);
    expect(mockPostManagerRegistry.cancelIfRunning).toHaveBeenCalledWith(
      submission.id,
    );

    // Simulate the post completing (with failure) - manually update the record
    const database = new PostyBirbDatabase('PostRecordSchema');
    await database.update(postRecord.id, {
      state: PostRecordState.FAILED,
      completedAt: new Date().toISOString(),
    });

    // Simulate posting finished
    mockPostManagerRegistry.isPostingType.mockReturnValue(false);

    queueRecord = await service.peek();
    expect(queueRecord).toBeDefined();
    expect(queueRecord.postRecord).toBeDefined();

    // We expect the post to be in a terminal state and cleanup of the record.
    // The post record should remain after the queue record is deleted.
    await service.execute();
    expect((await service.findAll()).length).toBe(0);
    postRecord = await postService.findById(postRecord.id);
    expect(postRecord.state).toBe(PostRecordState.FAILED);
    expect(postRecord.completedAt).toBeDefined();
  });
});
