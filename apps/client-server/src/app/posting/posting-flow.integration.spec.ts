import { EventEmitterModule } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { clearDatabase, Post, PostRepository } from '@postybirb/database';
import { PostyBirbDirectories, writeSync } from '@postybirb/fs';
import {
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
import { CreateSubmissionDto } from '../submission/dtos/create-submission.dto';
import { SubmissionService } from '../submission/services/submission.service';
import { SubmissionModule } from '../submission/submission.module';
import { CreateWebsiteOptionsDto } from '../website-options/dtos/create-website-options.dto';
import { WebsiteOptionsModule } from '../website-options/website-options.module';
import { WebsiteOptionsService } from '../website-options/website-options.service';
import TestWebsite from '../websites/implementations/test/test.website';
import { WebsiteRegistryService } from '../websites/website-registry.service';
import { PostingManager } from './posting-manager';
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
