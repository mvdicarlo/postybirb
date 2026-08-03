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
import { WebsiteRegistryService } from '../websites/website-registry.service';
import { PostingManager } from './posting-manager';
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
    };
    service = new PostingService(
      postingManager as unknown as PostingManager,
      websiteRegistry as unknown as WebsiteRegistryService,
    );
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

  it('gets the post by its submission relationship', async () => {
    const submission = await seedSubmission();
    const post = await postRepository.insert({ submissionId: submission.id });

    const result = await service.getPost(submission.id);

    expect(result?.id).toBe(post.id);
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
      [0, 1, 2, 3, 4].map((order) => ({
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

    expect(result.remainingWork.map((unit) => unit.fileId)).toEqual([
      files[0].id,
      files[2].id,
      files[3].id,
      files[4].id,
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
    expect(result.remainingWork.map((unit) => unit.id)).toContain(sharedWork.id);
    expect(result.removedWork.map((unit) => unit.id)).not.toContain(sharedWork.id);
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
      state: UnitOfWorkState.NEW,
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
      result.unitsOfWork.find(
        (unit) => unit.accountId === addedAccount.id,
      ),
    ).toMatchObject({
      postId: existingPost.id,
      submissionId: submission.id,
      fileId: file.id,
      fileHash: file.hash,
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
      evicted: false,
    });
    expect(
      await postRepository.find({
        where: (post, { eq }) => eq(post.submissionId, submission.id),
      }),
    ).toHaveLength(1);
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

    await expect(postRepository.findByIdOrThrow(post.id)).resolves.toMatchObject({
      completed: true,
      cancelled: false,
    });
    expect(postingManager.submit).not.toHaveBeenCalled();
  });

  it('continues failed and cancelled work', async () => {
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

    await expect(postRepository.findByIdOrThrow(post.id)).resolves.toMatchObject({
      completed: false,
    });
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

    await expect(
      service.areDependenciesCompleted(submission.id),
    ).resolves.toBe(false);
    await service.handlePendingWork();

    expect(postingManager.submit).toHaveBeenCalledTimes(1);
    expect(postingManager.submit).toHaveBeenCalledWith(
      incompleteDependencyPost.id,
    );

    await postRepository.update(incompleteDependencyPost.id, {
      completed: true,
    });
    postingManager.submit.mockClear();

    await expect(
      service.areDependenciesCompleted(submission.id),
    ).resolves.toBe(true);
    await service.handlePendingWork();

    expect(postingManager.submit).toHaveBeenCalledTimes(1);
    expect(postingManager.submit).toHaveBeenCalledWith(post.id);
  });

  it('persists cancellation and forwards it to the manager', async () => {
    const submission = await seedSubmission();
    const post = await postRepository.insert({ submissionId: submission.id });

    await service.cancelPost(post.id, 'User requested cancellation');

    expect(postingManager.cancel).toHaveBeenCalledWith(
      post.id,
      'User requested cancellation',
    );
    await expect(postRepository.findByIdOrThrow(post.id)).resolves.toMatchObject({
      completed: true,
      cancelled: true,
    });
  });
});