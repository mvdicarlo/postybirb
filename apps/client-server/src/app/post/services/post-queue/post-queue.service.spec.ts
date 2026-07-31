import { EventEmitterModule } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { clearDatabase } from '@postybirb/database';
import {
    AccountId,
    DefaultDescription,
    PostRecordResumeMode,
    ScheduleType,
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
import { UpdateSubmissionDto } from '../../../submission/dtos/update-submission.dto';
import { SubmissionService } from '../../../submission/services/submission.service';
import { SubmissionEventPublisher } from '../../../submission/submission-event.publisher';
import { SubmissionModule } from '../../../submission/submission.module';
import { CreateWebsiteOptionsDto } from '../../../website-options/dtos/create-website-options.dto';
import { WebsiteOptionsModule } from '../../../website-options/website-options.module';
import { WebsiteOptionsService } from '../../../website-options/website-options.service';
import { WebsitesModule } from '../../../websites/websites.module';
import { AttemptChainError } from '../../engine/attempt-chain';
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
        EventEmitterModule.forRoot(),
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
    expect(mockRelayPostManager.enqueue).toHaveBeenCalledWith(
      submission.id,
      undefined,
    );
  });

  it('forwards the resume mode chosen at enqueue time to the relay manager', async () => {
    const submission = await submissionService.create(createSubmissionDto());
    await websiteOptionsService.create(
      createWebsiteOptionsDto(
        submission.id,
        (await accountService.create(createAccountDto())).id,
      ),
    );

    await service.enqueue([submission.id], PostRecordResumeMode.CONTINUE_RETRY);
    mockRelayPostManager.isPosting.mockReturnValue(false);

    await service.execute();

    expect(mockRelayPostManager.enqueue).toHaveBeenCalledWith(
      submission.id,
      PostRecordResumeMode.CONTINUE_RETRY,
    );
  });

  it('keeps the first resume mode when an entry is already queued', async () => {
    const account = await accountService.create(createAccountDto());
    const submission = await submissionService.create(createSubmissionDto());
    await websiteOptionsService.create(
      createWebsiteOptionsDto(submission.id, account.id),
    );

    await service.enqueue([submission.id], PostRecordResumeMode.CONTINUE_RETRY);
    await service.enqueue([submission.id], PostRecordResumeMode.NEW);
    await service.execute();

    expect(mockRelayPostManager.enqueue).toHaveBeenCalledWith(
      submission.id,
      PostRecordResumeMode.CONTINUE_RETRY,
    );
  });

  it('does not carry a resume mode over to a new queue entry', async () => {
    const account = await accountService.create(createAccountDto());
    const submission = await submissionService.create(createSubmissionDto());
    await websiteOptionsService.create(
      createWebsiteOptionsDto(submission.id, account.id),
    );

    await service.enqueue([submission.id], PostRecordResumeMode.NEW);
    await service.dequeue([submission.id]);
    await service.enqueue([submission.id]);
    jest.clearAllMocks();

    await service.execute();

    expect(mockRelayPostManager.enqueue).toHaveBeenCalledWith(
      submission.id,
      undefined,
    );
  });

  it('reads the resume mode back from the database, not memory', async () => {
    const account = await accountService.create(createAccountDto());
    const submission = await submissionService.create(createSubmissionDto());
    await websiteOptionsService.create(
      createWebsiteOptionsDto(submission.id, account.id),
    );

    await service.enqueue([submission.id], PostRecordResumeMode.NEW);

    // A second instance has none of the first's in-memory state, standing in
    // for a restart between the enqueue and the cycle that starts the job.
    const restarted = new PostQueueService(
      module.get(SettingsService),
      mockRelayPostManager,
      module.get(SubmissionEventPublisher),
    );
    await restarted.execute();

    expect(mockRelayPostManager.enqueue).toHaveBeenCalledWith(
      submission.id,
      PostRecordResumeMode.NEW,
    );
  });

  describe('scheduled submissions', () => {
    async function createDueSubmission(
      scheduleType: ScheduleType,
    ): Promise<SubmissionId> {
      const account = await accountService.create(createAccountDto());
      const submission = await submissionService.create(createSubmissionDto());
      await websiteOptionsService.create(
        createWebsiteOptionsDto(submission.id, account.id),
      );

      const update = new UpdateSubmissionDto();
      update.isScheduled = true;
      update.scheduleType = scheduleType;
      update.scheduledFor = new Date(Date.now() - 60_000).toISOString();
      if (scheduleType === ScheduleType.RECURRING) {
        update.cron = '0 0 * * *';
      }
      await submissionService.update(submission.id, update);
      return submission.id;
    }

    /** The cron body no-ops under jest, so drop the NODE_ENV signal for it. */
    async function runScheduledCheck(): Promise<void> {
      const nodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      try {
        await service.checkForScheduledSubmissions();
      } finally {
        process.env.NODE_ENV = nodeEnv;
      }
    }

    it('posts a recurring schedule fresh rather than resuming it', async () => {
      const submissionId = await createDueSubmission(ScheduleType.RECURRING);

      await runScheduledCheck();
      await service.execute();

      expect(mockRelayPostManager.enqueue).toHaveBeenCalledWith(
        submissionId,
        PostRecordResumeMode.NEW,
      );
    });

    it('leaves a one-shot schedule on the engine default', async () => {
      const submissionId = await createDueSubmission(ScheduleType.SINGLE);

      await runScheduledCheck();
      await service.execute();

      expect(mockRelayPostManager.enqueue).toHaveBeenCalledWith(
        submissionId,
        undefined,
      );
    });

    it('does not leak either mode across a mixed batch', async () => {
      const recurringId = await createDueSubmission(ScheduleType.RECURRING);
      const singleId = await createDueSubmission(ScheduleType.SINGLE);

      await runScheduledCheck();
      await service.execute();

      expect(mockRelayPostManager.enqueue).toHaveBeenCalledWith(
        recurringId,
        PostRecordResumeMode.NEW,
      );
      expect(mockRelayPostManager.enqueue).toHaveBeenCalledWith(
        singleId,
        undefined,
      );
    });
  });

  it('keeps starting other submissions when one cannot be started', async () => {
    const account = await accountService.create(createAccountDto());
    const first = await submissionService.create(createSubmissionDto());
    await websiteOptionsService.create(
      createWebsiteOptionsDto(first.id, account.id),
    );
    const second = await submissionService.create(createSubmissionDto());
    await websiteOptionsService.create(
      createWebsiteOptionsDto(second.id, account.id),
    );

    await service.enqueue([first.id]);
    await service.enqueue([second.id]);
    mockRelayPostManager.enqueue.mockRejectedValueOnce(
      new Error('history unavailable'),
    );

    await expect(service.execute()).resolves.toBeUndefined();

    // The failure is contained: the other queued submission still started.
    expect(mockRelayPostManager.enqueue).toHaveBeenCalledTimes(2);
    // Neither record was dropped, so the failed one retries next cycle.
    expect(await service.peek()).not.toBeNull();
  });

  it('dequeues malformed lineage and clears its current-cycle dependency gate', async () => {
    const dependency = await submissionService.create(createSubmissionDto());
    const account = await accountService.create(createAccountDto());
    await websiteOptionsService.create(
      createWebsiteOptionsDto(dependency.id, account.id),
    );
    const dependent = await submissionService.create(createSubmissionDto());
    await websiteOptionsService.create(
      createWebsiteOptionsDto(dependent.id, account.id),
    );
    await submissionService.update(dependent.id, {
      metadata: { dependsOn: [dependency.id] },
    } as never);

    await service.enqueue([dependency.id, dependent.id]);
    mockRelayPostManager.enqueue.mockRejectedValueOnce(
      new AttemptChainError('missing parent'),
    );
    mockRelayPostManager.hasSucceeded.mockResolvedValue(true);

    await expect(service.execute()).resolves.toBeUndefined();

    expect(mockRelayPostManager.enqueue).toHaveBeenCalledWith(
      dependent.id,
      undefined,
    );
    expect(await service.peek()).toMatchObject({
      submissionId: dependent.id,
    });
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
        undefined,
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

      expect(mockRelayPostManager.enqueue).toHaveBeenCalledWith(
        dependent.id,
        undefined,
      );
    });

    it('re-enforces a restored chain: a re-queued dependency blocks its dependent despite a prior success', async () => {
      const dependency = await submissionService.create(createSubmissionDto());
      const dependent = await createDependentSubmission([dependency.id]);

      // The whole chain is unarchived and queued together again.
      await service.enqueue([dependency.id, dependent.id]);
      mockRelayPostManager.isPosting.mockReturnValue(false);
      // Its prior (pre-archive) run succeeded — this stale success must NOT
      // satisfy the gate now that the dependency is being re-posted.
      mockRelayPostManager.hasSucceeded.mockResolvedValue(true);
      // Nothing has produced a fresh outcome yet this round.
      mockRelayPostManager.getOutcome.mockResolvedValue(undefined);

      await service.execute();

      // The dependency itself is (re)enqueued to post again...
      expect(mockRelayPostManager.enqueue).toHaveBeenCalledWith(
        dependency.id,
        undefined,
      );
      // ...but the dependent is held back because the dependency is still queued
      // (its fresh post has not finished), even though hasSucceeded() is true.
      expect(mockRelayPostManager.enqueue).not.toHaveBeenCalledWith(
        dependent.id,
        undefined,
      );
      // The dependent remains queued for re-evaluation next cycle.
      expect(await service.peek()).not.toBeNull();
    });

    it('keeps the dependent blocked when one of several dependencies fails', async () => {
      const depA = await submissionService.create(createSubmissionDto());
      const depB = await submissionService.create(createSubmissionDto());
      const dependent = await createDependentSubmission([depA.id, depB.id]);

      await service.enqueue([dependent.id]);
      mockRelayPostManager.isPosting.mockReturnValue(false);
      mockRelayPostManager.hasSucceeded.mockImplementation(
        async (id) => id === depA.id,
      );

      await service.execute();

      expect(mockRelayPostManager.enqueue).not.toHaveBeenCalledWith(
        dependent.id,
        undefined,
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
      expect(mockRelayPostManager.enqueue).toHaveBeenCalledWith(
        submission.id,
        undefined,
      );
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
      expect(mockRelayPostManager.enqueue).toHaveBeenCalledWith(
        dependent.id,
        undefined,
      );
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
        undefined,
      );
    });
  });
});
