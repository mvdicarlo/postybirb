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
      isPosting: jest.fn().mockReturnValue(false),
      getOutcome: jest.fn().mockResolvedValue(undefined),
      getActiveTrees: jest.fn().mockReturnValue([]),
      getHistory: jest.fn().mockResolvedValue([]),
      hasSucceeded: jest.fn().mockResolvedValue(false),
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

    mockRelayPostManager.getOutcome.mockResolvedValue('SUCCEEDED' as never);
    await service.execute();

    expect(mockRelayPostManager.getOutcome).toHaveBeenCalledWith(
      submission.id,
      expect.any(String),
    );
    expect(await service.peek()).toBeNull();
  });

  describe('dependsOn gating', () => {
    async function createDependentSubmission(dependsOn: SubmissionId[]) {
      const account = await accountService.create(createAccountDto());
      const submission = await submissionService.create(createSubmissionDto());
      await websiteOptionsService.create(
        createWebsiteOptionsDto(submission.id, account.id),
      );
      await submissionService.update(submission.id, {
        metadata: { dependsOn },
      } as never);
      return submission;
    }

    it('holds back a submission whose dependency has not succeeded', async () => {
      const dependency = await submissionService.create(createSubmissionDto());
      const dependent = await createDependentSubmission([dependency.id]);

      await service.enqueue([dependent.id]);
      mockRelayPostManager.isPosting.mockReturnValue(false);
      mockRelayPostManager.hasSucceeded.mockResolvedValue(false);

      await service.execute();

      expect(mockRelayPostManager.hasSucceeded).toHaveBeenCalledWith(
        dependency.id,
      );
      expect(mockRelayPostManager.enqueue).not.toHaveBeenCalledWith(
        dependent.id,
      );
      // Still queued for re-evaluation next cycle.
      expect(await service.peek()).not.toBeNull();
    });

    it('enqueues a submission once every dependency has succeeded', async () => {
      const dependency = await submissionService.create(createSubmissionDto());
      const dependent = await createDependentSubmission([dependency.id]);

      await service.enqueue([dependent.id]);
      mockRelayPostManager.isPosting.mockReturnValue(false);
      mockRelayPostManager.hasSucceeded.mockResolvedValue(true);

      await service.execute();

      expect(mockRelayPostManager.enqueue).toHaveBeenCalledWith(dependent.id);
    });

    it('keeps the dependent blocked when one of several dependencies fails', async () => {
      const depA = await submissionService.create(createSubmissionDto());
      const depB = await submissionService.create(createSubmissionDto());
      const dependent = await createDependentSubmission([depA.id, depB.id]);

      await service.enqueue([dependent.id]);
      mockRelayPostManager.isPosting.mockReturnValue(false);
      mockRelayPostManager.hasSucceeded.mockImplementation(async (id) =>
        id === depA.id,
      );

      await service.execute();

      expect(mockRelayPostManager.enqueue).not.toHaveBeenCalledWith(
        dependent.id,
      );
    });

    it('enqueues a submission with no declared dependencies', async () => {
      const account = await accountService.create(createAccountDto());
      const submission = await submissionService.create(createSubmissionDto());
      await websiteOptionsService.create(
        createWebsiteOptionsDto(submission.id, account.id),
      );

      await service.enqueue([submission.id]);
      mockRelayPostManager.isPosting.mockReturnValue(false);

      await service.execute();

      expect(mockRelayPostManager.hasSucceeded).not.toHaveBeenCalled();
      expect(mockRelayPostManager.enqueue).toHaveBeenCalledWith(submission.id);
    });

    it('strips references to deleted dependencies and proceeds', async () => {
      const dependent = await createDependentSubmission([
        'deleted-dependency-id' as SubmissionId,
      ]);

      await service.enqueue([dependent.id]);
      mockRelayPostManager.isPosting.mockReturnValue(false);

      await service.execute();

      // The stale id is unsatisfiable and never consulted on the relay manager.
      expect(mockRelayPostManager.hasSucceeded).not.toHaveBeenCalledWith(
        'deleted-dependency-id',
      );
      // Self-healed: the stale id is removed from the submission metadata.
      const updated = await submissionService.findById(dependent.id);
      expect(updated?.metadata.dependsOn ?? []).toEqual([]);
      // With no remaining blockers it proceeds to post.
      expect(mockRelayPostManager.enqueue).toHaveBeenCalledWith(dependent.id);
    });

    it('strips a deleted dependency but stays blocked on a live one', async () => {
      const live = await submissionService.create(createSubmissionDto());
      const dependent = await createDependentSubmission([
        'deleted-dependency-id' as SubmissionId,
        live.id,
      ]);

      await service.enqueue([dependent.id]);
      mockRelayPostManager.isPosting.mockReturnValue(false);
      mockRelayPostManager.hasSucceeded.mockResolvedValue(false);

      await service.execute();

      // Stale id removed, the still-existing dependency is retained.
      const updated = await submissionService.findById(dependent.id);
      expect(updated?.metadata.dependsOn ?? []).toEqual([live.id]);
      // Still blocked by the live, unsatisfied dependency.
      expect(mockRelayPostManager.enqueue).not.toHaveBeenCalledWith(
        dependent.id,
      );
    });
  });
});
