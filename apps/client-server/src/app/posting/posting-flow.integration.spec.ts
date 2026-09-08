import { EventEmitterModule } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { clearDatabase, getDatabase, Post, PostEventSchema, PostRecordSchema, PostRepository } from '@postybirb/database';
import { PostyBirbDirectories, writeSync } from '@postybirb/fs';
import {
  PostEventType,
  PostRecordResumeMode,
  PostRecordState,
  SubmissionRating,
  SubmissionType,
  UnitOfWorkState,
} from '@postybirb/types';
import { readFileSync } from 'fs';
import { join } from 'path';
import { AccountModule } from '../account/account.module';
import { AccountService } from '../account/account.service';
import { CreateAccountDto } from '../account/dtos/create-account.dto';
import { MulterFileInfo } from '../file/models/multer-file-info';
import { TestPlatformModule } from '../platform/testing/test-platform.module';
import { SettingsService } from '../settings/settings.service';
import { CreateSubmissionDto } from '../submission/dtos/create-submission.dto';
import { SubmissionService } from '../submission/services/submission.service';
import { SubmissionModule } from '../submission/submission.module';
import { CreateWebsiteOptionsDto } from '../website-options/dtos/create-website-options.dto';
import { WebsiteOptionsModule } from '../website-options/website-options.module';
import { WebsiteOptionsService } from '../website-options/website-options.service';
import TestWebsite from '../websites/implementations/test/test.website';
import { WebsiteRegistryService } from '../websites/website-registry.service';
import { LegacyPostHistoryMigrationService } from './legacy-post-history-migration.service';
import { PostingManager } from './posting-manager';
import { PostingController } from './posting.controller';
import { PostingModule } from './posting.module';
import { PostingService } from './posting.service';

describe('Posting flow integration', () => {
  let module: TestingModule;
  let accountService: AccountService;
  let postingManager: PostingManager;
  let postingService: PostingService;
  let submissionService: SubmissionService;
  let websiteOptionsService: WebsiteOptionsService;
  let postRepository: PostRepository;

  beforeEach(async () => {
    clearDatabase();

    module = await Test.createTestingModule({
      imports: [
        EventEmitterModule.forRoot({ global: true }),
        TestPlatformModule,
        AccountModule,
        SubmissionModule,
        WebsiteOptionsModule,
        PostingModule,
      ],
    }).compile();

    await module.init();
    await module.get(WebsiteRegistryService).waitForInitialization(5_000);

    accountService = module.get(AccountService);
    postingManager = module.get(PostingManager);
    postingService = module.get(PostingService);
    submissionService = module.get(SubmissionService);
    websiteOptionsService = module.get(WebsiteOptionsService);
    postRepository = new PostRepository();
  });

  afterEach(async () => {
    await module.close();
    jest.restoreAllMocks();
    clearDatabase();
  });

  async function waitForCompletedPost(postId: string): Promise<Post> {
    const deadline = Date.now() + 5_000;

    while (Date.now() < deadline) {
      const post = await postRepository.findByIdOrThrow(postId);
      if (post.completed && !postingManager.isAccepted(postId)) {
        return post;
      }
      await new Promise((resolve) => {
        setTimeout(resolve, 10);
      });
    }

    const post = await postRepository.findByIdOrThrow(postId);
    throw new Error(
      `Post '${postId}' did not complete; states: ${post.unitsOfWork
        .map((unit) => unit.state)
        .join(', ')}`,
    );
  }

  function createTestFile(): { buffer: Buffer; file: MulterFileInfo } {
    const buffer = readFileSync(
      join(__dirname, '../../test-files/small_image.jpg'),
    );
    const path = `${PostyBirbDirectories.DATA_DIRECTORY}/${Date.now()}.jpg`;
    writeSync(path, buffer);

    return {
      buffer,
      file: {
        fieldname: 'file',
        originalname: 'small_image.jpg',
        encoding: '',
        mimetype: 'image/jpeg',
        size: buffer.length,
        destination: '',
        filename: 'small_image.jpg',
        path,
        origin: undefined,
      },
    };
  }

  async function createMessageSubmission(name: string) {
    const accountDto = new CreateAccountDto();
    accountDto.name = name;
    accountDto.website = 'test';
    accountDto.groups = [];
    const account = await accountService.create(accountDto);
    const submissionDto = new CreateSubmissionDto();
    submissionDto.name = name;
    submissionDto.type = SubmissionType.MESSAGE;
    const submission = await submissionService.create(submissionDto);
    await websiteOptionsService.create({
      accountId: account.id,
      submissionId: submission.id,
      data: { title: name, rating: SubmissionRating.GENERAL },
    } as CreateWebsiteOptionsDto);
    return submission;
  }

  it.each(Object.values(PostRecordState).filter(
    (state) => state !== PostRecordState.DONE && state !== PostRecordState.FAILED,
  ))('resumes partial legacy %s work only after manual re-queue', async (state) => {
    const submission = await createMessageSubmission('Partial legacy message');
    const initialWork = await postingService.getIncompleteWork(submission.id);
    const succeededAccountId = initialWork.remainingWork[0].accountId;
    const unfinishedAccount = await accountService.create({
      name: 'Unfinished legacy account', website: 'test', groups: [],
    } as CreateAccountDto);
    await websiteOptionsService.create({
      accountId: unfinishedAccount.id,
      submissionId: submission.id,
      data: { title: 'Partial legacy message', rating: SubmissionRating.GENERAL },
    } as CreateWebsiteOptionsDto);
    const db = getDatabase();
    await db.insert(PostRecordSchema).values({
      id: 'partial-legacy', submissionId: submission.id,
      resumeMode: PostRecordResumeMode.CONTINUE, state,
    });
    await db.insert(PostEventSchema).values([
      {
        id: 'legacy-success', postRecordId: 'partial-legacy',
        accountId: succeededAccountId, eventType: PostEventType.MESSAGE_POSTED,
        sourceUrl: 'https://example.com/already-posted',
      },
      {
        id: 'legacy-unfinished', postRecordId: 'partial-legacy',
        accountId: unfinishedAccount.id, eventType: PostEventType.POST_ATTEMPT_STARTED,
      },
    ]);

    await module.get(LegacyPostHistoryMigrationService).migrate();
    const migrated = await postingService.getPost(submission.id);
    expect(migrated).toMatchObject({ completed: true, cancelled: false });
    await postingService.unpausePosts();
    await postingService.handlePendingWork();
    expect(postingManager.isAccepted(migrated.id)).toBe(false);
    expect((await postingService.getPost(submission.id)).completed).toBe(true);

    const remaining = await postingService.getIncompleteWork(submission.id);
    expect(remaining.remainingWork).toHaveLength(1);
    expect(remaining.remainingWork[0].accountId).toBe(unfinishedAccount.id);
    const send = jest.spyOn(TestWebsite.prototype, 'onPostMessageSubmission');
    const staged = await postingService.post(submission.id);
    await postingService.handlePendingWork();
    const completed = await waitForCompletedPost(staged.id);
    expect(send).toHaveBeenCalledTimes(1);
    expect(completed.unitsOfWork).toHaveLength(2);
    expect(completed.unitsOfWork.every((unit) => unit.state === UnitOfWorkState.SUCCEEDED)).toBe(true);
    expect(completed.unitsOfWork.find((unit) => unit.accountId === succeededAccountId))
      .toMatchObject({ url: 'https://example.com/already-posted', state: UnitOfWorkState.SUCCEEDED });
  }, 10_000);

  it('creates and posts a message submission while tracking its outcome', async () => {
    const accountDto = new CreateAccountDto();
    accountDto.name = 'Integration account';
    accountDto.website = 'test';
    accountDto.groups = [];
    const account = await accountService.create(accountDto);

    const submissionDto = new CreateSubmissionDto();
    submissionDto.name = 'Integration message';
    submissionDto.type = SubmissionType.MESSAGE;
    const submission = await submissionService.create(submissionDto);

    await websiteOptionsService.create({
      accountId: account.id,
      submissionId: submission.id,
      data: {
        title: 'Integration message',
        rating: SubmissionRating.GENERAL,
      },
    } as CreateWebsiteOptionsDto);

    const stagedPost = await postingService.post(submission.id);

    expect(stagedPost.completed).toBe(false);
    expect(stagedPost.cancelled).toBe(false);
    expect(stagedPost.unitsOfWork).toHaveLength(1);
    expect(stagedPost.unitsOfWork[0]).toEqual(
      expect.objectContaining({
        accountId: account.id,
        state: UnitOfWorkState.PENDING,
      }),
    );

    await postingService.handlePendingWork();
    const completedPost = await waitForCompletedPost(stagedPost.id);

    expect(completedPost.completed).toBe(true);
    expect(completedPost.cancelled).toBe(false);
    expect(completedPost.unitsOfWork).toHaveLength(1);
    expect(completedPost.unitsOfWork[0]).toEqual(
      expect.objectContaining({
        accountId: account.id,
        evicted: false,
        state: UnitOfWorkState.SUCCEEDED,
        response: expect.objectContaining({
          message: 'test message',
          stage: 'test',
        }),
      }),
    );
    expect(postingManager.isAccepted(completedPost.id)).toBe(false);
    expect(
      (await submissionService.findByIdOrThrow(submission.id)).isArchived,
    ).toBe(true);
  }, 10_000);

  it('persists pause controls and holds manually staged work until resumed', async () => {
    const submission = await createMessageSubmission('Paused integration message');
    const controller = module.get(PostingController);
    const settingsService = module.get(SettingsService);

    await expect(controller.pause()).resolves.toEqual({ paused: true });
    const post = await postingService.post(submission.id);
    await expect(controller.isPaused()).resolves.toEqual({ paused: true });
    await expect(settingsService.getDefaultSettings()).resolves.toMatchObject({
      settings: { queuePaused: true },
    });
    await postingService.handlePendingWork();
    expect(postingManager.isAccepted(post.id)).toBe(false);
    expect((await postRepository.findByIdOrThrow(post.id)).unitsOfWork[0].state)
      .toBe(UnitOfWorkState.PENDING);

    await expect(controller.unpause()).resolves.toEqual({ paused: false });
    await expect(settingsService.getDefaultSettings()).resolves.toMatchObject({
      settings: { queuePaused: false },
    });
    await postingService.handlePendingWork();
    const completed = await waitForCompletedPost(post.id);
    expect(completed.unitsOfWork[0].state).toBe(UnitOfWorkState.SUCCEEDED);
  }, 10_000);

  it('rejects retry until the cancelled worker drains, then posts the retry successfully', async () => {
    const submission = await createMessageSubmission('Cancel and retry integration message');
    const post = await postingService.post(submission.id);
    let releaseDispatch: (() => void) | undefined;
    let signalDispatchStarted!: () => void;
    const dispatchStarted = new Promise<void>((resolve) => {
      signalDispatchStarted = resolve;
    });
    const send = jest.spyOn(TestWebsite.prototype, 'onPostMessageSubmission')
      .mockImplementationOnce(async (_postData, cancellationToken) => {
        await new Promise<void>((resolve) => {
          releaseDispatch = resolve;
          signalDispatchStarted();
        });
        cancellationToken.throwIfAborted();
        return { instanceId: 'test' };
      });

    try {
      await postingService.handlePendingWork();
      await dispatchStarted;
      await postingService.cancelPost(post.id);
      expect(postingManager.isAccepted(post.id)).toBe(true);
      await expect(postingService.post(submission.id)).rejects.toThrow(
        `Post '${post.id}' is currently active`,
      );
      expect((await postRepository.findByIdOrThrow(post.id)).unitsOfWork[0].state)
        .toBe(UnitOfWorkState.CANCELLED);

      releaseDispatch?.();
      await waitForCompletedPost(post.id);
      const retry = await postingService.post(submission.id);
      expect(retry.unitsOfWork[0].state).toBe(UnitOfWorkState.PENDING);
      await postingService.handlePendingWork();
      const completed = await waitForCompletedPost(retry.id);
      expect(completed.unitsOfWork[0].state).toBe(UnitOfWorkState.SUCCEEDED);
      expect(send).toHaveBeenCalledTimes(2);
    } finally {
      releaseDispatch?.();
      await waitForCompletedPost(post.id);
    }
  }, 10_000);

  it('creates and posts a file submission with its persisted file', async () => {
    const postFileSpy = jest.spyOn(
      TestWebsite.prototype,
      'onPostFileSubmission',
    );
    const accountDto = new CreateAccountDto();
    accountDto.name = 'Integration account';
    accountDto.website = 'test';
    accountDto.groups = [];
    const account = await accountService.create(accountDto);

    const { buffer, file } = createTestFile();
    const submissionDto = new CreateSubmissionDto();
    submissionDto.name = 'Integration file';
    submissionDto.type = SubmissionType.FILE;
    const submission = await submissionService.create(submissionDto, file);

    await websiteOptionsService.create({
      accountId: account.id,
      submissionId: submission.id,
      data: {
        title: 'Integration file',
        rating: SubmissionRating.GENERAL,
      },
    } as CreateWebsiteOptionsDto);

    const stagedPost = await postingService.post(submission.id);
    expect(stagedPost.unitsOfWork).toHaveLength(1);
    expect(stagedPost.unitsOfWork[0]).toEqual(
      expect.objectContaining({
        accountId: account.id,
        fileId: submission.files[0].id,
        state: UnitOfWorkState.PENDING,
      }),
    );

    await postingService.handlePendingWork();
    const completedPost = await waitForCompletedPost(stagedPost.id);

    expect(postFileSpy).toHaveBeenCalledTimes(1);
    const postedFiles = postFileSpy.mock.calls[0][1];
    expect(postedFiles).toHaveLength(1);
    expect(postedFiles[0]).toEqual(
      expect.objectContaining({
        id: submission.files[0].id,
        mimeType: 'image/jpeg',
        width: 138,
        height: 202,
        buffer,
      }),
    );
    expect(completedPost.completed).toBe(true);
    expect(completedPost.unitsOfWork[0]).toEqual(
      expect.objectContaining({
        fileId: submission.files[0].id,
        state: UnitOfWorkState.SUCCEEDED,
      }),
    );
    expect(
      (await submissionService.findByIdOrThrow(submission.id)).isArchived,
    ).toBe(true);
  }, 10_000);
});
