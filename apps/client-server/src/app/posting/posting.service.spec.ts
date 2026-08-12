import { EventEmitter2 } from '@nestjs/event-emitter';
import {
    AccountRepository,
    clearDatabase,
    PostRepository,
    SubmissionFileRepository,
    SubmissionRepository,
    UnitOfWorkRepository,
    WebsiteOptionsRepository,
} from '@postybirb/database';
import type {
    ISubmissionMetadata,
    IWebsiteFormFields,
    SubmissionId,
} from '@postybirb/types';
import {
    DefaultSubmissionFileMetadata,
    ScheduleType,
    SubmissionType,
    UnitOfWorkState,
} from '@postybirb/types';
import { SUBMISSION_PROJECTION_CHANGED } from '../submission/submission.events';
import { WebsiteRegistryService } from '../websites/website-registry.service';
import { PostingManager } from './posting-manager';
import { PostingRateLimiterService } from './posting-rate-limiter.service';
import { PostingService } from './posting.service';

describe('PostingService', () => {
  let service: PostingService;
  let accountRepository: AccountRepository;
  let postRepository: PostRepository;
  let fileRepository: SubmissionFileRepository;
  let submissionRepository: SubmissionRepository;
  let unitOfWorkRepository: UnitOfWorkRepository;
  let websiteOptionsRepository: WebsiteOptionsRepository;
  let postingManager: {
    submit: jest.Mock;
    cancel: jest.Mock;
  };
  let websiteRegistry: {
    ensureInstance: jest.Mock;
    findInstance: jest.Mock;
  };
  let postingRateLimiter: {
    initialize: jest.Mock;
  };
  let eventEmitter: {
    emit: jest.Mock;
  };

  beforeEach(() => {
    clearDatabase();
    postingManager = {
      submit: jest.fn().mockResolvedValue(true),
      cancel: jest.fn().mockResolvedValue(true),
    };
    websiteRegistry = {
      ensureInstance: jest.fn().mockResolvedValue({
        decoratedProps: {
          fileOptions: { fileBatchSize: 1 },
        },
      }),
      findInstance: jest.fn().mockReturnValue({
        decoratedProps: {
          fileOptions: { acceptsExternalSourceUrls: false },
        },
      }),
    };
    postingRateLimiter = {
      initialize: jest.fn().mockResolvedValue(undefined),
    };
    eventEmitter = {
      emit: jest.fn(),
    };
    service = new PostingService(
      postingManager as unknown as PostingManager,
      websiteRegistry as unknown as WebsiteRegistryService,
      postingRateLimiter as unknown as PostingRateLimiterService,
      eventEmitter as unknown as EventEmitter2,
    );
    // A fresh service is paused by its startup lock.
    service.unpausePosts();
    accountRepository = new AccountRepository();
    postRepository = new PostRepository();
    fileRepository = new SubmissionFileRepository();
    submissionRepository = new SubmissionRepository();
    unitOfWorkRepository = new UnitOfWorkRepository();
    websiteOptionsRepository = new WebsiteOptionsRepository();
  });

  afterEach(() => {
    clearDatabase();
  });

  async function seedSubmission(dependsOn: SubmissionId[] = []) {
    return submissionRepository.insert({
      type: SubmissionType.FILE,
      isScheduled: false,
      isTemplate: false,
      isMultiSubmission: false,
      isArchived: false,
      isInitialized: true,
      schedule: { scheduleType: ScheduleType.NONE },
      metadata: {} as ISubmissionMetadata,
      dependsOn,
      order: 0,
    });
  }

  async function seedAccount(name: string) {
    return accountRepository.insert({
      name,
      website: name,
      groups: [],
    });
  }

  async function seedScheduledSubmission(
    scheduleType: ScheduleType,
    scheduledFor = new Date(Date.now() - 1_000).toISOString(),
    cron?: string,
  ) {
    return submissionRepository.insert({
      type: SubmissionType.FILE,
      isScheduled: true,
      isTemplate: false,
      isMultiSubmission: false,
      isArchived: false,
      isInitialized: true,
      schedule: { scheduleType, scheduledFor, cron },
      metadata: {} as ISubmissionMetadata,
      dependsOn: [],
      order: 0,
    });
  }

  it('runs due schedules oldest first while skipping active and future posts', async () => {
    const now = Date.now();
    const completedRecurring = await seedScheduledSubmission(
      ScheduleType.RECURRING,
      new Date(now - 2_000).toISOString(),
      '* * * * * *',
    );
    const newSingle = await seedScheduledSubmission(
      ScheduleType.SINGLE,
      new Date(now - 1_000).toISOString(),
    );
    const activeSingle = await seedScheduledSubmission(
      ScheduleType.SINGLE,
      new Date(now - 3_000).toISOString(),
    );
    await seedScheduledSubmission(
      ScheduleType.SINGLE,
      new Date(now + 60_000).toISOString(),
    );
    await postRepository.insert({
      submissionId: completedRecurring.id,
      completed: true,
    });
    await postRepository.insert({ submissionId: activeSingle.id });
    const scheduled: string[] = [];
    jest
      .spyOn(service, 'scheduleRecurringTypeSubmission')
      .mockImplementation(async (submission) => {
        scheduled.push(submission.id);
      });
    jest
      .spyOn(service, 'scheduleSingleTypeSubmission')
      .mockImplementation(async (submission) => {
        scheduled.push(submission.id);
      });

    const nodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    try {
      await service.handleScheduledSubmissions();
    } finally {
      process.env.NODE_ENV = nodeEnv;
    }

    expect(scheduled).toEqual([completedRecurring.id, newSingle.id]);
  });

  it('schedules a single submission and waits for it to be unscheduled', async () => {
    const submission = await seedScheduledSubmission(ScheduleType.SINGLE);
    const post = await postRepository.insert({ submissionId: submission.id });
    const postSubmission = jest.spyOn(service, 'post').mockResolvedValue(post);
    const serviceSubmissionRepository = Reflect.get(
      service,
      'submissionRepository',
    ) as SubmissionRepository;
    let resolveUpdate!: (updated: typeof submission) => void;
    const updatePromise = new Promise<typeof submission>((resolve) => {
      resolveUpdate = resolve;
    });
    const update = jest
      .spyOn(serviceSubmissionRepository, 'update')
      .mockReturnValue(updatePromise);
    let completed = false;

    const scheduling = service
      .scheduleSingleTypeSubmission(submission)
      .then(() => {
        completed = true;
      });
    await Promise.resolve();
    await Promise.resolve();

    expect(update).toHaveBeenCalledWith(submission.id, {
      isScheduled: false,
    });
    expect(postSubmission).toHaveBeenCalledWith(submission.id);
    expect(completed).toBe(false);

    resolveUpdate(submission);
    await scheduling;
    expect(completed).toBe(true);
  });

  it('schedules a single submission and persists its post', async () => {
    const submission = await seedScheduledSubmission(ScheduleType.SINGLE);
    const account = await seedAccount('scheduled-single-account');
    await websiteOptionsRepository.insert({
      accountId: account.id,
      submissionId: submission.id,
      data: {} as IWebsiteFormFields,
      isDefault: false,
    });

    await service.scheduleSingleTypeSubmission(submission);

    await expect(
      submissionRepository.findByIdOrThrow(submission.id),
    ).resolves.toMatchObject({ isScheduled: false });
    const post = await service.getPost(submission.id);
    expect(post).toMatchObject({ completed: false, cancelled: false });
    expect(post?.unitsOfWork).toHaveLength(1);
    expect(post?.unitsOfWork[0]).toMatchObject({
      accountId: account.id,
      state: UnitOfWorkState.PENDING,
      evicted: false,
    });
  });

  it('advances a recurring submission with a fresh generation of work', async () => {
    const scheduledFor = new Date(Date.now() - 1_000).toISOString();
    const submission = await seedScheduledSubmission(
      ScheduleType.RECURRING,
      scheduledFor,
      '* * * * * *',
    );
    const account = await seedAccount('scheduled-recurring-account');
    const secondAccount = await seedAccount(
      'second-scheduled-recurring-account',
    );
    await websiteOptionsRepository.insert({
      accountId: account.id,
      submissionId: submission.id,
      data: {} as IWebsiteFormFields,
      isDefault: false,
    });
    await websiteOptionsRepository.insert({
      accountId: secondAccount.id,
      submissionId: submission.id,
      data: {} as IWebsiteFormFields,
      isDefault: false,
    });
    const post = await postRepository.insert({
      submissionId: submission.id,
      completed: true,
    });
    const previousWork = await unitOfWorkRepository.insert({
      postId: post.id,
      submissionId: submission.id,
      accountId: account.id,
      state: UnitOfWorkState.SUCCEEDED,
    });
    const secondPreviousWork = await unitOfWorkRepository.insert({
      postId: post.id,
      submissionId: submission.id,
      accountId: secondAccount.id,
      state: UnitOfWorkState.SUCCEEDED,
    });

    const schedulingStartedAt = Date.now();
    await service.scheduleRecurringTypeSubmission(submission);

    const updatedSubmission = await submissionRepository.findByIdOrThrow(
      submission.id,
    );
    expect(updatedSubmission.isScheduled).toBe(true);
    expect(updatedSubmission.schedule.scheduledFor).not.toBe(scheduledFor);
    expect(
      new Date(updatedSubmission.schedule.scheduledFor as string).getTime(),
    ).toBeGreaterThan(schedulingStartedAt);
    const updatedPost = await postRepository.findByIdOrThrow(post.id);
    expect(updatedPost).toMatchObject({ completed: false, cancelled: false });
    expect(updatedPost.unitsOfWork).toHaveLength(4);
    for (const previous of [previousWork, secondPreviousWork]) {
      expect(
        updatedPost.unitsOfWork.find((unit) => unit.id === previous.id),
      ).toMatchObject({
        state: UnitOfWorkState.SUCCEEDED,
        evicted: true,
      });
    }
    for (const accountId of [account.id, secondAccount.id]) {
      expect(
        updatedPost.unitsOfWork.find(
          (unit) =>
            unit.id !== previousWork.id &&
            unit.id !== secondPreviousWork.id &&
            unit.accountId === accountId,
        ),
      ).toMatchObject({
        state: UnitOfWorkState.PENDING,
        evicted: false,
      });
    }
  });

  it('unschedules a recurring submission that has no cron expression', async () => {
    const submission = await seedScheduledSubmission(ScheduleType.RECURRING);

    await service.scheduleRecurringTypeSubmission(submission);

    await expect(
      submissionRepository.findByIdOrThrow(submission.id),
    ).resolves.toMatchObject({ isScheduled: false });
  });

  it('gets the post by its submission relationship', async () => {
    const submission = await seedSubmission();
    const post = await postRepository.insert({ submissionId: submission.id });

    const result = await service.getPost(submission.id);

    expect(result?.id).toBe(post.id);
  });

  it('holds posting until the startup lock is released', async () => {
    const pausedService = new PostingService(
      postingManager as unknown as PostingManager,
      websiteRegistry as unknown as WebsiteRegistryService,
      postingRateLimiter as unknown as PostingRateLimiterService,
    );
    const submission = await seedSubmission();
    const account = await seedAccount('startup-lock-account');
    const post = await postRepository.insert({ submissionId: submission.id });
    await unitOfWorkRepository.insert({
      postId: post.id,
      submissionId: submission.id,
      accountId: account.id,
      batch: 'ready-batch',
      state: UnitOfWorkState.NEW,
    });

    expect(pausedService.arePostsPaused()).toBe(true);
    await pausedService.handlePendingWork();
    expect(postingManager.submit).not.toHaveBeenCalled();

    pausedService.unpausePosts();

    expect(pausedService.arePostsPaused()).toBe(false);
    await pausedService.handlePendingWork();
    expect(postingManager.submit).toHaveBeenCalledWith(post.id);
  });

  it('dry runs the work that would run without persisting it', async () => {
    const submission = await seedSubmission();
    const account = await seedAccount('dry-run-account');
    await websiteOptionsRepository.insert({
      accountId: account.id,
      submissionId: submission.id,
      data: {} as IWebsiteFormFields,
      isDefault: false,
    });

    const result = await service.dryRun(submission.id);

    expect(result.paused).toBe(false);
    expect(result.dependenciesCompleted).toBe(true);
    expect(result.executableWork.map((unit) => unit.compositeKey)).toEqual([
      `${submission.id}:${account.id}:`,
    ]);
    expect(result.deferredWork).toEqual([]);
    expect(result.remainingWork).toHaveLength(1);
    await expect(service.getPost(submission.id)).resolves.toBeNull();
    await expect(unitOfWorkRepository.findAll()).resolves.toEqual([]);
  });

  it('dry runs rate limited work as deferred', async () => {
    const submission = await seedSubmission();
    const account = await seedAccount('dry-run-deferred-account');
    await websiteOptionsRepository.insert({
      accountId: account.id,
      submissionId: submission.id,
      data: {} as IWebsiteFormFields,
      isDefault: false,
    });
    const post = await postRepository.insert({ submissionId: submission.id });
    await unitOfWorkRepository.insert({
      postId: post.id,
      submissionId: submission.id,
      accountId: account.id,
      batch: 'deferred-batch',
      state: UnitOfWorkState.RATE_LIMITED,
      rateLimitedUntil: new Date(Date.now() + 60_000).toISOString(),
    });

    const result = await service.dryRun(submission.id);

    expect(result.executableWork).toEqual([]);
    expect(result.deferredWork).toHaveLength(1);
  });

  it('dry runs nothing as executable while a dependency is incomplete', async () => {
    const dependency = await seedSubmission();
    const submission = await seedSubmission([dependency.id]);
    const account = await seedAccount('dry-run-dependency-account');
    await websiteOptionsRepository.insert({
      accountId: account.id,
      submissionId: submission.id,
      data: {} as IWebsiteFormFields,
      isDefault: false,
    });

    const result = await service.dryRun(submission.id);

    expect(result.dependenciesCompleted).toBe(false);
    expect(result.executableWork).toEqual([]);
    expect(result.deferredWork).toHaveLength(1);
  });

  it('returns all potential work as remaining when no post exists', async () => {
    const submission = await seedSubmission();
    const account = await seedAccount('new-account');
    const file = await fileRepository.insert({
      submissionId: submission.id,
      fileName: 'image.png',
      hash: 'hash-1',
      mimeType: 'image/png',
      size: 1,
      width: 1,
      height: 1,
      hasThumbnail: false,
      metadata: DefaultSubmissionFileMetadata(),
    });
    await websiteOptionsRepository.insert({
      accountId: account.id,
      submissionId: submission.id,
      data: {} as IWebsiteFormFields,
      isDefault: false,
    });

    const result = await service.getIncompleteWork(submission.id);

    expect(result.remainingWork.map((unit) => unit.compositeKey)).toEqual([
      `${submission.id}:${account.id}:${file.id}`,
    ]);
    expect(result.removedWork).toEqual([]);
    expect(result.evicted).toEqual([]);
  });

  it('assigns ordered file work to shared website-sized batches', async () => {
    const submission = await seedSubmission();
    const account = await seedAccount('batched-account');
    const files = await fileRepository.insert(
      [3, 0, 4, 1, 2].map((order) => ({
        submissionId: submission.id,
        fileName: `image-${order}.png`,
        hash: `hash-${order}`,
        mimeType: 'image/png',
        size: 1,
        width: 1,
        height: 1,
        hasThumbnail: false,
        order,
        metadata: {
          ...DefaultSubmissionFileMetadata(),
          ignoredWebsites: order === 1 ? [account.id] : [],
        },
      })),
    );
    await websiteOptionsRepository.insert({
      accountId: account.id,
      submissionId: submission.id,
      data: {} as IWebsiteFormFields,
      isDefault: false,
    });
    websiteRegistry.ensureInstance.mockResolvedValue({
      decoratedProps: {
        fileOptions: { fileBatchSize: 2 },
      },
    });

    const result = await service.getIncompleteWork(submission.id);

    const filesByOrder = new Map(files.map((file) => [file.order, file]));
    expect(result.remainingWork.map((unit) => unit.fileId)).toEqual([
      filesByOrder.get(0)?.id,
      filesByOrder.get(2)?.id,
      filesByOrder.get(3)?.id,
      filesByOrder.get(4)?.id,
    ]);
    const batches = result.remainingWork.map((unit) => unit.batch);
    const uuidV4 =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
    expect(batches[0]).toMatch(uuidV4);
    expect(batches[0]).toBe(batches[1]);
    expect(batches[2]).toMatch(uuidV4);
    expect(batches[2]).toBe(batches[3]);
    expect(batches[2]).not.toBe(batches[0]);
  });

  it('returns unfinished existing and new work by composite key', async () => {
    const submission = await seedSubmission();
    const sharedAccount = await seedAccount('shared-account');
    const removedAccount = await seedAccount('removed-account');
    const addedAccount = await seedAccount('added-account');
    const file = await fileRepository.insert({
      submissionId: submission.id,
      fileName: 'image.png',
      hash: 'hash-1',
      mimeType: 'image/png',
      size: 1,
      width: 1,
      height: 1,
      hasThumbnail: false,
      metadata: {
        ...DefaultSubmissionFileMetadata(),
        ignoredWebsites: [removedAccount.id],
      },
    });
    await websiteOptionsRepository.insert(
      [sharedAccount, removedAccount, addedAccount].map((account) => ({
        accountId: account.id,
        submissionId: submission.id,
        data: {} as IWebsiteFormFields,
        isDefault: false,
      })),
    );
    const post = await postRepository.insert({
      submissionId: submission.id,
      cancelled: true,
    });
    const [sharedWork, removedWork] = await unitOfWorkRepository.insert([
      {
        postId: post.id,
        submissionId: submission.id,
        accountId: sharedAccount.id,
        fileId: file.id,
        fileHash: file.hash,
      },
      {
        postId: post.id,
        submissionId: submission.id,
        accountId: removedAccount.id,
        fileId: file.id,
        fileHash: file.hash,
      },
    ]);

    const result = await service.getIncompleteWork(submission.id);

    expect(result.remainingWork.map((unit) => unit.compositeKey)).toEqual([
      `${submission.id}:${sharedAccount.id}:${file.id}`,
      `${submission.id}:${addedAccount.id}:${file.id}`,
    ]);
    expect(result.removedWork).toHaveLength(1);
    expect(result.removedWork[0].id).toBe(removedWork.id);
    expect(result.removedWork[0].compositeKey).toBe(
      `${submission.id}:${removedAccount.id}:${file.id}`,
    );
    expect(result.remainingWork.map((unit) => unit.id)).toContain(
      sharedWork.id,
    );
    expect(result.removedWork.map((unit) => unit.id)).not.toContain(
      sharedWork.id,
    );
    expect(result.evicted).toEqual([]);
  });

  it('skips succeeded work unless it is explicitly evicted', async () => {
    const submission = await seedSubmission();
    const account = await seedAccount('succeeded-account');
    const file = await fileRepository.insert({
      submissionId: submission.id,
      fileName: 'image.png',
      hash: 'hash-1',
      mimeType: 'image/png',
      size: 1,
      width: 1,
      height: 1,
      hasThumbnail: false,
      metadata: DefaultSubmissionFileMetadata(),
    });
    await websiteOptionsRepository.insert({
      accountId: account.id,
      submissionId: submission.id,
      data: {} as IWebsiteFormFields,
      isDefault: false,
    });
    const post = await postRepository.insert({ submissionId: submission.id });
    const succeeded = await unitOfWorkRepository.insert({
      postId: post.id,
      submissionId: submission.id,
      accountId: account.id,
      fileId: file.id,
      fileHash: file.hash,
      state: UnitOfWorkState.SUCCEEDED,
    });
    await postRepository.update(post.id, { completed: true });

    const unchanged = await service.getIncompleteWork(submission.id);

    expect(unchanged.remainingWork).toEqual([]);
    expect(unchanged.evicted).toEqual([]);

    const repost = await service.getIncompleteWork(submission.id, {
      [account.id]: [file.id],
    });

    expect(repost.evicted.map((unit) => unit.id)).toEqual([succeeded.id]);
    expect(repost.remainingWork).toHaveLength(1);
    expect(repost.remainingWork[0]).toMatchObject({
      postId: '',
      submissionId: submission.id,
      accountId: account.id,
      fileId: file.id,
      state: UnitOfWorkState.NEW,
    });
    expect(repost.remainingWork[0].id).not.toBe(succeeded.id);

    const persisted = await service.post(submission.id, {
      [account.id]: [file.id],
    });
    const historical = persisted.unitsOfWork.find(
      (unit) => unit.id === succeeded.id,
    );
    const replacement = persisted.unitsOfWork.find(
      (unit) => unit.id !== succeeded.id,
    );
    expect(historical).toMatchObject({
      state: UnitOfWorkState.SUCCEEDED,
      evicted: true,
    });
    expect(replacement).toMatchObject({
      postId: post.id,
      state: UnitOfWorkState.PENDING,
      evicted: false,
    });
  });

  it('reuses failed work as pending when a user starts the post again', async () => {
    const submission = await seedSubmission();
    const account = await seedAccount('failed-repost-account');
    await websiteOptionsRepository.insert({
      accountId: account.id,
      submissionId: submission.id,
      data: {} as IWebsiteFormFields,
      isDefault: false,
    });
    const post = await postRepository.insert({
      submissionId: submission.id,
      completed: true,
    });
    const failed = await unitOfWorkRepository.insert({
      postId: post.id,
      submissionId: submission.id,
      accountId: account.id,
      state: UnitOfWorkState.FAILED,
    });

    const repost = await service.post(submission.id);

    expect(repost.completed).toBe(false);
    expect(repost.unitsOfWork).toHaveLength(1);
    expect(repost.unitsOfWork[0]).toMatchObject({
      id: failed.id,
      postId: post.id,
      submissionId: submission.id,
      accountId: account.id,
      state: UnitOfWorkState.PENDING,
      evicted: false,
    });
  });

  it('evicts selected files or every unit for an account', async () => {
    const submission = await seedSubmission();
    const selectedFileAccount = await seedAccount('selected-file-account');
    const wholeAccount = await seedAccount('whole-account');
    const untouchedAccount = await seedAccount('untouched-account');
    const [firstFile, secondFile] = await fileRepository.insert([
      {
        submissionId: submission.id,
        fileName: 'first.png',
        hash: 'hash-1',
        mimeType: 'image/png',
        size: 1,
        width: 1,
        height: 1,
        hasThumbnail: false,
        metadata: DefaultSubmissionFileMetadata(),
      },
      {
        submissionId: submission.id,
        fileName: 'second.png',
        hash: 'hash-2',
        mimeType: 'image/png',
        size: 1,
        width: 1,
        height: 1,
        hasThumbnail: false,
        metadata: DefaultSubmissionFileMetadata(),
      },
    ]);
    const accounts = [selectedFileAccount, wholeAccount, untouchedAccount];
    await websiteOptionsRepository.insert(
      accounts.map((account) => ({
        accountId: account.id,
        submissionId: submission.id,
        data: {} as IWebsiteFormFields,
        isDefault: false,
      })),
    );
    const post = await postRepository.insert({ submissionId: submission.id });
    await unitOfWorkRepository.insert(
      accounts.flatMap((account) =>
        [firstFile, secondFile].map((file) => ({
          postId: post.id,
          submissionId: submission.id,
          accountId: account.id,
          fileId: file.id,
          fileHash: file.hash,
        })),
      ),
    );

    const result = await service.getIncompleteWork(submission.id, {
      [selectedFileAccount.id]: [firstFile.id],
      [wholeAccount.id]: [],
    });

    expect(result.remainingWork).toHaveLength(6);
    expect(result.removedWork).toEqual([]);
    expect(result.evicted.map((unit) => unit.compositeKey).sort()).toEqual(
      [
        `${submission.id}:${selectedFileAccount.id}:${firstFile.id}`,
        `${submission.id}:${wholeAccount.id}:${firstFile.id}`,
        `${submission.id}:${wholeAccount.id}:${secondFile.id}`,
      ].sort(),
    );
  });

  it('creates a post and its missing units of work', async () => {
    const submission = await seedSubmission();
    const account = await seedAccount('new-post-account');
    const file = await fileRepository.insert({
      submissionId: submission.id,
      fileName: 'image.png',
      hash: 'hash-1',
      mimeType: 'image/png',
      size: 1,
      width: 1,
      height: 1,
      hasThumbnail: false,
      metadata: DefaultSubmissionFileMetadata(),
    });
    await websiteOptionsRepository.insert({
      accountId: account.id,
      submissionId: submission.id,
      data: {} as IWebsiteFormFields,
      isDefault: false,
    });

    const result = await service.post(submission.id);

    expect(result.submissionId).toBe(submission.id);
    expect(result.completed).toBe(false);
    expect(result.cancelled).toBe(false);
    expect(result.unitsOfWork).toHaveLength(1);
    expect(result.unitsOfWork[0]).toMatchObject({
      postId: result.id,
      submissionId: submission.id,
      accountId: account.id,
      fileId: file.id,
      fileHash: file.hash,
      state: UnitOfWorkState.PENDING,
      evicted: false,
    });
    expect(result.unitsOfWork[0].batch).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(
      await postRepository.find({
        where: (post, { eq }) => eq(post.submissionId, submission.id),
      }),
    ).toHaveLength(1);
  });

  it('reuses and resets a post while applying incomplete work', async () => {
    const submission = await seedSubmission();
    const explicitlyEvictedAccount = await seedAccount('evicted-account');
    const removedAccount = await seedAccount('removed-account');
    const addedAccount = await seedAccount('added-account');
    const file = await fileRepository.insert({
      submissionId: submission.id,
      fileName: 'image.png',
      hash: 'hash-1',
      mimeType: 'image/png',
      size: 1,
      width: 1,
      height: 1,
      hasThumbnail: false,
      metadata: {
        ...DefaultSubmissionFileMetadata(),
        ignoredWebsites: [removedAccount.id],
      },
    });
    await websiteOptionsRepository.insert(
      [explicitlyEvictedAccount, removedAccount, addedAccount].map(
        (account) => ({
          accountId: account.id,
          submissionId: submission.id,
          data: {} as IWebsiteFormFields,
          isDefault: false,
        }),
      ),
    );
    const existingPost = await postRepository.insert({
      submissionId: submission.id,
      completed: true,
      cancelled: true,
    });
    const [explicitlyEvictedWork, removedWork] =
      await unitOfWorkRepository.insert([
        {
          postId: existingPost.id,
          submissionId: submission.id,
          accountId: explicitlyEvictedAccount.id,
          fileId: file.id,
          fileHash: file.hash,
        },
        {
          postId: existingPost.id,
          submissionId: submission.id,
          accountId: removedAccount.id,
          fileId: file.id,
          fileHash: file.hash,
        },
      ]);

    const result = await service.post(submission.id, {
      [explicitlyEvictedAccount.id]: [file.id],
    });

    expect(result.id).toBe(existingPost.id);
    expect(result.completed).toBe(false);
    expect(result.cancelled).toBe(false);
    expect(result.unitsOfWork).toHaveLength(4);
    expect(
      result.unitsOfWork.find((unit) => unit.id === explicitlyEvictedWork.id)
        ?.evicted,
    ).toBe(true);
    expect(
      result.unitsOfWork.find((unit) => unit.id === removedWork.id)?.evicted,
    ).toBe(true);
    expect(
      result.unitsOfWork.find((unit) => unit.accountId === addedAccount.id),
    ).toMatchObject({
      postId: existingPost.id,
      submissionId: submission.id,
      fileId: file.id,
      fileHash: file.hash,
      state: UnitOfWorkState.PENDING,
      evicted: false,
    });
    expect(
      result.unitsOfWork.find(
        (unit) =>
          unit.accountId === explicitlyEvictedAccount.id && !unit.evicted,
      ),
    ).toMatchObject({
      postId: existingPost.id,
      submissionId: submission.id,
      fileId: file.id,
      fileHash: file.hash,
      state: UnitOfWorkState.PENDING,
      evicted: false,
    });
    expect(
      await postRepository.find({
        where: (post, { eq }) => eq(post.submissionId, submission.id),
      }),
    ).toHaveLength(1);
  });

  it('rejects posting while the persisted post is open', async () => {
    const submission = await seedSubmission();
    const post = await postRepository.insert({
      submissionId: submission.id,
      completed: false,
      cancelled: false,
    });

    await expect(service.post(submission.id)).rejects.toThrow(
      `Post '${post.id}' is currently active`,
    );
  });

  it('submits active posts but skips cancelled posts', async () => {
    const activeSubmission = await seedSubmission();
    const cancelledSubmission = await seedSubmission();
    const account = await seedAccount('cron-account');
    const activePost = await postRepository.insert({
      submissionId: activeSubmission.id,
    });
    const cancelledPost = await postRepository.insert({
      submissionId: cancelledSubmission.id,
      cancelled: true,
    });
    await unitOfWorkRepository.insert([
      {
        postId: activePost.id,
        submissionId: activeSubmission.id,
        accountId: account.id,
      },
      {
        postId: cancelledPost.id,
        submissionId: cancelledSubmission.id,
        accountId: account.id,
      },
    ]);

    await service.handlePendingWork();

    expect(postingManager.submit).toHaveBeenCalledTimes(1);
    expect(postingManager.submit).toHaveBeenCalledWith(activePost.id);
  });

  it('completes a post with no remaining work', async () => {
    const submission = await seedSubmission();
    const post = await postRepository.insert({ submissionId: submission.id });

    await service.handlePendingWork();

    await expect(
      postRepository.findByIdOrThrow(post.id),
    ).resolves.toMatchObject({
      completed: true,
      cancelled: false,
    });
    expect(postingManager.submit).not.toHaveBeenCalled();
  });

  it('continues cancelled work while leaving failed work settled', async () => {
    const submission = await seedSubmission();
    const account = await seedAccount('terminal-work-account');
    const post = await postRepository.insert({ submissionId: submission.id });
    await unitOfWorkRepository.insert([
      {
        postId: post.id,
        submissionId: submission.id,
        accountId: account.id,
        state: UnitOfWorkState.FAILED,
      },
      {
        postId: post.id,
        submissionId: submission.id,
        accountId: account.id,
        state: UnitOfWorkState.CANCELLED,
      },
    ]);

    await service.handlePendingWork();

    await expect(
      postRepository.findByIdOrThrow(post.id),
    ).resolves.toMatchObject({
      completed: false,
    });
    expect(postingManager.submit).toHaveBeenCalledWith(post.id);
  });

  it('completes a post when all active work has succeeded or failed', async () => {
    const submission = await seedSubmission();
    const account = await seedAccount('settled-work-account');
    const post = await postRepository.insert({ submissionId: submission.id });
    await unitOfWorkRepository.insert([
      {
        postId: post.id,
        submissionId: submission.id,
        accountId: account.id,
        state: UnitOfWorkState.SUCCEEDED,
      },
      {
        postId: post.id,
        submissionId: submission.id,
        accountId: account.id,
        state: UnitOfWorkState.FAILED,
      },
    ]);

    await service.handlePendingWork();

    await expect(
      postRepository.findByIdOrThrow(post.id),
    ).resolves.toMatchObject({ completed: true });
    expect(postingManager.submit).not.toHaveBeenCalled();
  });

  it('completes failed work even when its reservation has not expired', async () => {
    const submission = await seedSubmission();
    const account = await seedAccount('reserved-failure-account');
    const post = await postRepository.insert({ submissionId: submission.id });
    await unitOfWorkRepository.insert({
      postId: post.id,
      submissionId: submission.id,
      accountId: account.id,
      state: UnitOfWorkState.FAILED,
      rateLimitedUntil: new Date(Date.now() + 60_000).toISOString(),
    });

    await service.handlePendingWork();

    await expect(
      postRepository.findByIdOrThrow(post.id),
    ).resolves.toMatchObject({ completed: true });
    expect(postingManager.submit).not.toHaveBeenCalled();
  });

  it('does not submit external-source work while a source producer is deferred', async () => {
    const submission = await seedSubmission();
    const sourceAccount = await seedAccount('source-account');
    const externalAccount = await seedAccount('external-account');
    const post = await postRepository.insert({ submissionId: submission.id });
    await unitOfWorkRepository.insert([
      {
        postId: post.id,
        submissionId: submission.id,
        accountId: sourceAccount.id,
        batch: 'source-batch',
        state: UnitOfWorkState.RATE_LIMITED,
        rateLimitedUntil: new Date(Date.now() + 60_000).toISOString(),
      },
      {
        postId: post.id,
        submissionId: submission.id,
        accountId: externalAccount.id,
        batch: 'external-batch',
        state: UnitOfWorkState.NEW,
      },
    ]);
    websiteRegistry.findInstance.mockImplementation(
      (account: { id: string }) => ({
        decoratedProps: {
          fileOptions: {
            acceptsExternalSourceUrls: account.id === externalAccount.id,
          },
        },
      }),
    );

    await service.handlePendingWork();

    expect(postingManager.submit).not.toHaveBeenCalled();
  });

  it('does not submit a post when every outstanding batch is deferred', async () => {
    const submission = await seedSubmission();
    const account = await seedAccount('deferred-account');
    const post = await postRepository.insert({ submissionId: submission.id });
    await unitOfWorkRepository.insert({
      postId: post.id,
      submissionId: submission.id,
      accountId: account.id,
      batch: 'deferred-batch',
      state: UnitOfWorkState.RATE_LIMITED,
      rateLimitedUntil: new Date(Date.now() + 60_000).toISOString(),
    });

    await service.handlePendingWork();

    expect(postingManager.submit).not.toHaveBeenCalled();
    await expect(
      postRepository.findByIdOrThrow(post.id),
    ).resolves.toMatchObject({
      completed: false,
      cancelled: false,
    });
  });

  it('continues to later posts when an earlier post is fully deferred', async () => {
    const deferredSubmission = await seedSubmission();
    const readySubmission = await seedSubmission();
    const account = await seedAccount('deferred-order-account');
    const deferredPost = await postRepository.insert({
      submissionId: deferredSubmission.id,
      updatedAt: '2026-08-05T00:00:00.000Z',
    });
    const readyPost = await postRepository.insert({
      submissionId: readySubmission.id,
      updatedAt: '2026-08-05T00:00:01.000Z',
    });
    await unitOfWorkRepository.insert([
      {
        postId: deferredPost.id,
        submissionId: deferredSubmission.id,
        accountId: account.id,
        batch: 'deferred-batch',
        state: UnitOfWorkState.RATE_LIMITED,
        rateLimitedUntil: new Date(Date.now() + 60_000).toISOString(),
      },
      {
        postId: readyPost.id,
        submissionId: readySubmission.id,
        accountId: account.id,
        batch: 'ready-batch',
        state: UnitOfWorkState.NEW,
      },
    ]);

    await service.handlePendingWork();

    expect(postingManager.submit).toHaveBeenCalledTimes(1);
    expect(postingManager.submit).toHaveBeenCalledWith(readyPost.id);
  });

  it('continues to later posts when an earlier post throws', async () => {
    const failingSubmission = await seedSubmission();
    const readySubmission = await seedSubmission();
    const account = await seedAccount('isolated-failure-account');
    const failingPost = await postRepository.insert({
      submissionId: failingSubmission.id,
      updatedAt: '2026-08-05T00:00:00.000Z',
    });
    const readyPost = await postRepository.insert({
      submissionId: readySubmission.id,
      updatedAt: '2026-08-05T00:00:01.000Z',
    });
    await unitOfWorkRepository.insert([
      {
        postId: failingPost.id,
        submissionId: failingSubmission.id,
        accountId: account.id,
        batch: 'failing-batch',
        state: UnitOfWorkState.NEW,
      },
      {
        postId: readyPost.id,
        submissionId: readySubmission.id,
        accountId: account.id,
        batch: 'ready-batch',
        state: UnitOfWorkState.NEW,
      },
    ]);
    jest
      .spyOn(service, 'areDependenciesCompleted')
      .mockImplementation(async (submissionId) => {
        if (submissionId === failingSubmission.id) {
          throw new Error('dependency lookup failed');
        }
        return true;
      });

    await expect(service.handlePendingWork()).resolves.toBeUndefined();

    expect(postingManager.submit).toHaveBeenCalledTimes(1);
    expect(postingManager.submit).toHaveBeenCalledWith(readyPost.id);
  });

  it('skips the cycle when rate limit hydration fails', async () => {
    const submission = await seedSubmission();
    const account = await seedAccount('hydration-failure-account');
    const post = await postRepository.insert({ submissionId: submission.id });
    await unitOfWorkRepository.insert({
      postId: post.id,
      submissionId: submission.id,
      accountId: account.id,
      batch: 'ready-batch',
      state: UnitOfWorkState.NEW,
    });
    postingRateLimiter.initialize.mockRejectedValue(new Error('hydration'));

    await expect(service.handlePendingWork()).resolves.toBeUndefined();

    expect(postingManager.submit).not.toHaveBeenCalled();
  });

  it('submits a mixed post when at least one whole batch is ready', async () => {
    const submission = await seedSubmission();
    const account = await seedAccount('mixed-rate-limit-account');
    const post = await postRepository.insert({ submissionId: submission.id });
    await unitOfWorkRepository.insert([
      {
        postId: post.id,
        submissionId: submission.id,
        accountId: account.id,
        batch: 'deferred-batch',
        state: UnitOfWorkState.RATE_LIMITED,
        rateLimitedUntil: new Date(Date.now() + 60_000).toISOString(),
      },
      {
        postId: post.id,
        submissionId: submission.id,
        accountId: account.id,
        batch: 'ready-batch',
        state: UnitOfWorkState.NEW,
      },
    ]);

    await service.handlePendingWork();

    expect(postingManager.submit).toHaveBeenCalledWith(post.id);
  });

  it('submits work when its rate limit has expired', async () => {
    const submission = await seedSubmission();
    const account = await seedAccount('expired-rate-limit-account');
    const post = await postRepository.insert({ submissionId: submission.id });
    await unitOfWorkRepository.insert({
      postId: post.id,
      submissionId: submission.id,
      accountId: account.id,
      batch: 'expired-batch',
      state: UnitOfWorkState.RATE_LIMITED,
      rateLimitedUntil: new Date(Date.now() - 1).toISOString(),
    });

    await service.handlePendingWork();

    expect(postingManager.submit).toHaveBeenCalledWith(post.id);
  });

  it('skips a post until every dependency post is completed', async () => {
    const completedDependency = await seedSubmission();
    const incompleteDependency = await seedSubmission();
    const submission = await seedSubmission([
      completedDependency.id,
      incompleteDependency.id,
    ]);
    const account = await seedAccount('dependency-account');
    await postRepository.insert({
      submissionId: completedDependency.id,
      completed: true,
    });
    const incompleteDependencyPost = await postRepository.insert({
      submissionId: incompleteDependency.id,
    });
    const post = await postRepository.insert({ submissionId: submission.id });
    await unitOfWorkRepository.insert([
      {
        postId: incompleteDependencyPost.id,
        submissionId: incompleteDependency.id,
        accountId: account.id,
      },
      {
        postId: post.id,
        submissionId: submission.id,
        accountId: account.id,
      },
    ]);

    await expect(service.areDependenciesCompleted(submission.id)).resolves.toBe(
      false,
    );
    await service.handlePendingWork();

    expect(postingManager.submit).toHaveBeenCalledTimes(1);
    expect(postingManager.submit).toHaveBeenCalledWith(
      incompleteDependencyPost.id,
    );

    await postRepository.update(incompleteDependencyPost.id, {
      completed: true,
    });
    postingManager.submit.mockClear();

    await expect(service.areDependenciesCompleted(submission.id)).resolves.toBe(
      true,
    );
    await service.handlePendingWork();

    expect(postingManager.submit).toHaveBeenCalledTimes(1);
    expect(postingManager.submit).toHaveBeenCalledWith(post.id);
  });

  it('does not satisfy dependencies with a cancelled completed post', async () => {
    const dependency = await seedSubmission();
    const submission = await seedSubmission([dependency.id]);
    await postRepository.insert({
      submissionId: dependency.id,
      completed: true,
      cancelled: true,
    });

    await expect(service.areDependenciesCompleted(submission.id)).resolves.toBe(
      false,
    );
  });

  it('persists cancellation and forwards it to the manager', async () => {
    const submission = await seedSubmission();
    const post = await postRepository.insert({ submissionId: submission.id });

    await service.cancelPost(post.id, 'User requested cancellation');

    expect(postingManager.cancel).toHaveBeenCalledWith(
      post.id,
      'User requested cancellation',
    );
    await expect(
      postRepository.findByIdOrThrow(post.id),
    ).resolves.toMatchObject({
      completed: true,
      cancelled: true,
    });
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      SUBMISSION_PROJECTION_CHANGED,
      [expect.objectContaining({ submissionIds: [submission.id] })],
    );
  });
});
