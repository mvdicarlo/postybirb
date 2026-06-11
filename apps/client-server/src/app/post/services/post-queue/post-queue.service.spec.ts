import { Test, TestingModule } from '@nestjs/testing';
import { clearDatabase } from '@postybirb/database';
import {
  AccountId,
  DefaultDescription,
  SubmissionId,
  SubmissionRating,
  SubmissionType,
} from '@postybirb/types';
import { AccountModule } from '../../../account/account.module';
import { AccountService } from '../../../account/account.service';
import { CreateAccountDto } from '../../../account/dtos/create-account.dto';
import { TestPlatformModule } from '../../../platform/testing/test-platform.module';
import { SettingsService } from '../../../settings/settings.service';
import { CreateSubmissionDto } from '../../../submission/dtos/create-submission.dto';
import { SubmissionService } from '../../../submission/services/submission.service';
import { SubmissionModule } from '../../../submission/submission.module';
import { CreateWebsiteOptionsDto } from '../../../website-options/dtos/create-website-options.dto';
import { WebsiteOptionsModule } from '../../../website-options/website-options.module';
import { WebsiteOptionsService } from '../../../website-options/website-options.service';
import { WebsitesModule } from '../../../websites/websites.module';
import { RelayPostManager } from '../../engine/post-manager.service';
import { PostModule } from '../../post.module';
import { PostQueueService } from './post-queue.service';

describe('PostQueueService', () => {
  let service: PostQueueService;
  let module: TestingModule;
  let submissionService: SubmissionService;
  let accountService: AccountService;
  let websiteOptionsService: WebsiteOptionsService;
  let mockRelayPostManager: jest.Mocked<RelayPostManager>;

  beforeEach(async () => {
    clearDatabase();

    mockRelayPostManager = {
      enqueue: jest.fn().mockResolvedValue('job_1'),
      cancel: jest.fn().mockReturnValue(true),
      acknowledge: jest.fn(),
      isPosting: jest.fn().mockReturnValue(false),
      getOutcome: jest.fn().mockReturnValue(undefined),
      getActiveTrees: jest.fn().mockReturnValue([]),
      getHistory: jest.fn().mockResolvedValue([]),
      recover: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<RelayPostManager>;

    module = await Test.createTestingModule({
      imports: [
        TestPlatformModule,
        SubmissionModule,
        AccountModule,
        WebsiteOptionsModule,
        WebsitesModule,
        PostModule,
      ],
    })
      .overrideProvider(RelayPostManager)
      .useValue(mockRelayPostManager)
      .compile();

    service = module.get<PostQueueService>(PostQueueService);
    submissionService = module.get<SubmissionService>(SubmissionService);
    accountService = module.get<AccountService>(AccountService);
    const settingsService = module.get<SettingsService>(SettingsService);
    websiteOptionsService = module.get<WebsiteOptionsService>(
      WebsiteOptionsService,
    );
    await accountService.onModuleInit();
    await settingsService.onModuleInit();
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
      tags: { overrideDefault: true, tags: ['test'] },
      description: { overrideDefault: true, description: DefaultDescription() },
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

  it('pauses and resumes the queue', async () => {
    await service.pause();
    expect(await service.isPaused()).toBe(true);
    await service.resume();
    expect(await service.isPaused()).toBe(false);
  });

  it('enqueues and dequeues submissions', async () => {
    const submission = await submissionService.create(createSubmissionDto());

    await service.enqueue([submission.id, submission.id]);
    const top = await service.peek();
    expect(top).not.toBeNull();
    expect(top?.submissionId).toBe(submission.id);

    await service.dequeue([submission.id]);
    expect(await service.peek()).toBeNull();
    expect(mockRelayPostManager.cancel).toHaveBeenCalledWith(submission.id);
  });

  it('starts a Relay job for a queued submission on execute', async () => {
    const account = await accountService.create(createAccountDto());
    const submission = await submissionService.create(createSubmissionDto());
    await websiteOptionsService.create(
      createWebsiteOptionsDto(submission.id, account.id),
    );

    await service.enqueue([submission.id]);
    mockRelayPostManager.isPosting.mockReturnValue(false);

    await service.execute();
    expect(mockRelayPostManager.enqueue).toHaveBeenCalledWith(submission.id);
  });

  it('dequeues a submission whose Relay job has finished', async () => {
    const submission = await submissionService.create(createSubmissionDto());
    await service.enqueue([submission.id]);

    mockRelayPostManager.getOutcome.mockReturnValue('SUCCEEDED' as never);
    await service.execute();

    expect(mockRelayPostManager.acknowledge).toHaveBeenCalledWith(submission.id);
    expect(await service.peek()).toBeNull();
  });
});
