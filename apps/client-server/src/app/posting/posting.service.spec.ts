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
} from '@postybirb/types';
import {
    DefaultSubmissionFileMetadata,
    ScheduleType,
    SubmissionType,
    UnitOfWorkState,
} from '@postybirb/types';
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

  beforeEach(() => {
    clearDatabase();
    postingManager = {
      submit: jest.fn().mockResolvedValue(true),
      cancel: jest.fn().mockResolvedValue(true),
    };
    service = new PostingService(
      postingManager as unknown as PostingManager,
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

  async function seedSubmission() {
    return submissionRepository.insert({
      type: SubmissionType.FILE,
      isScheduled: false,
      isTemplate: false,
      isMultiSubmission: false,
      isArchived: false,
      isInitialized: true,
      schedule: { scheduleType: ScheduleType.NONE },
      metadata: {} as ISubmissionMetadata,
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

  it('returns all potential work as missing when no post exists', async () => {
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

    expect(result.missingWork.map((unit) => unit.compositeKey)).toEqual([
      `${submission.id}:${account.id}:${file.id}`,
    ]);
    expect(result.removedWork).toEqual([]);
    expect(result.evicted).toEqual([]);
  });

  it('finds missing and file-ignored work by composite key', async () => {
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

    expect(result.missingWork.map((unit) => unit.compositeKey)).toEqual([
      `${submission.id}:${addedAccount.id}:${file.id}`,
    ]);
    expect(result.removedWork).toHaveLength(1);
    expect(result.removedWork[0].id).toBe(removedWork.id);
    expect(result.removedWork[0].compositeKey).toBe(
      `${submission.id}:${removedAccount.id}:${file.id}`,
    );
    expect(result.missingWork).not.toContain(sharedWork);
    expect(result.removedWork).not.toContain(sharedWork);
    expect(result.evicted).toEqual([]);
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

    expect(result.missingWork).toEqual([]);
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
    expect(result.unitsOfWork).toHaveLength(3);
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

  it('completes a post when all remaining work is terminal', async () => {
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
      completed: true,
    });
    expect(postingManager.submit).not.toHaveBeenCalled();
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