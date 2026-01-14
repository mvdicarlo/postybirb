import { Test, TestingModule } from '@nestjs/testing';
import { clearDatabase } from '@postybirb/database';
import {
    EntityId,
    PostEventType,
    PostRecordResumeMode,
    PostRecordState,
    SubmissionType,
} from '@postybirb/types';
import { AccountModule } from '../../../account/account.module';
import { AccountService } from '../../../account/account.service';
import { PostEvent, PostRecord } from '../../../drizzle/models';
import { PostyBirbDatabase } from '../../../drizzle/postybirb-database/postybirb-database';
import { PostParsersModule } from '../../../post-parsers/post-parsers.module';
import { CreateSubmissionDto } from '../../../submission/dtos/create-submission.dto';
import { SubmissionService } from '../../../submission/services/submission.service';
import { SubmissionModule } from '../../../submission/submission.module';
import { UserSpecifiedWebsiteOptionsModule } from '../../../user-specified-website-options/user-specified-website-options.module';
import { WebsitesModule } from '../../../websites/websites.module';
import { PostEventRepository } from './post-event.repository';
import { PostRecordFactory, ResumeContext } from './post-record-factory.service';

describe('PostRecordFactory', () => {
  let module: TestingModule;
  let factory: PostRecordFactory;
  let submissionService: SubmissionService;
  let accountService: AccountService;
  let postRecordRepository: PostyBirbDatabase<'PostRecordSchema'>;
  let postEventRepository: PostEventRepository;

  beforeEach(async () => {
    clearDatabase();

    module = await Test.createTestingModule({
      imports: [
        SubmissionModule,
        AccountModule,
        WebsitesModule,
        UserSpecifiedWebsiteOptionsModule,
        PostParsersModule,
      ],
      providers: [PostRecordFactory, PostEventRepository],
    }).compile();

    factory = module.get<PostRecordFactory>(PostRecordFactory);
    submissionService = module.get<SubmissionService>(SubmissionService);
    accountService = module.get<AccountService>(AccountService);
    postEventRepository = module.get<PostEventRepository>(PostEventRepository);
    postRecordRepository = new PostyBirbDatabase('PostRecordSchema');

    await accountService.onModuleInit();
  });

  afterAll(async () => {
    await module.close();
  });

  async function createSubmission(): Promise<EntityId> {
    const dto = new CreateSubmissionDto();
    dto.name = 'Test Submission';
    dto.type = SubmissionType.MESSAGE;
    const submission = await submissionService.create(dto);
    return submission.id;
  }

  async function createAccount(name: string): Promise<EntityId> {
    const dto = {
      name,
      website: 'test',
      groups: [],
    };
    const account = await accountService.create(dto as any);
    return account.id;
  }

  describe('createFresh', () => {
    it('should create a fresh PostRecord with RESTART mode', async () => {
      const submissionId = await createSubmission();
      const record = await factory.createFresh(submissionId);

      expect(record).toBeDefined();
      expect(record.submissionId).toBe(submissionId);
      expect(record.state).toBe(PostRecordState.PENDING);
      expect(record.resumeMode).toBe(PostRecordResumeMode.RESTART);
      expect(record.id).toBeDefined();
      expect(record.createdAt).toBeDefined();
    });

    it('should create multiple fresh records for different submissions', async () => {
      const submission1 = await createSubmission();
      const submission2 = await createSubmission();

      const record1 = await factory.createFresh(submission1);
      const record2 = await factory.createFresh(submission2);

      expect(record1.submissionId).toBe(submission1);
      expect(record2.submissionId).toBe(submission2);
      expect(record1.id).not.toBe(record2.id);
    });
  });

  describe('createFromPrior', () => {
    it('should create a PostRecord from a prior record', async () => {
      const submissionId = await createSubmission();
      const priorRecord = await factory.createFresh(submissionId);

      const newRecord = await factory.createFromPrior(
        priorRecord.id,
        PostRecordResumeMode.CONTINUE,
      );

      expect(newRecord).toBeDefined();
      expect(newRecord.submissionId).toBe(submissionId);
      expect(newRecord.state).toBe(PostRecordState.PENDING);
      expect(newRecord.resumeMode).toBe(PostRecordResumeMode.CONTINUE);
      expect(newRecord.id).not.toBe(priorRecord.id);
    });

    it('should throw error if prior record not found', async () => {
      await expect(
        factory.createFromPrior(
          'non-existent-id' as EntityId,
          PostRecordResumeMode.CONTINUE,
        ),
      ).rejects.toThrow('Prior post record not found');
    });

    it('should create records with different resume modes', async () => {
      const submissionId = await createSubmission();
      const priorRecord = await factory.createFresh(submissionId);

      const continueRecord = await factory.createFromPrior(
        priorRecord.id,
        PostRecordResumeMode.CONTINUE,
      );
      const retryRecord = await factory.createFromPrior(
        priorRecord.id,
        PostRecordResumeMode.CONTINUE_RETRY,
      );
      const restartRecord = await factory.createFromPrior(
        priorRecord.id,
        PostRecordResumeMode.RESTART,
      );

      expect(continueRecord.resumeMode).toBe(PostRecordResumeMode.CONTINUE);
      expect(retryRecord.resumeMode).toBe(PostRecordResumeMode.CONTINUE_RETRY);
      expect(restartRecord.resumeMode).toBe(PostRecordResumeMode.RESTART);
    });
  });

  describe('buildResumeContext', () => {
    async function createPostRecordWithState(
      submissionId: EntityId,
      state: PostRecordState,
      resumeMode: PostRecordResumeMode,
    ): Promise<PostRecord> {
      const record = await postRecordRepository.insert({
        submissionId,
        state,
        resumeMode,
      });
      return record;
    }

    async function addEvent(
      postRecordId: EntityId,
      eventType: PostEventType,
      accountId?: string,
      additionalData?: Partial<PostEvent>,
    ): Promise<PostEvent> {
      const eventData: any = {
        postRecordId,
        eventType,
        ...additionalData,
      };
      
      // Only add accountId if provided
      if (accountId) {
        eventData.accountId = accountId as EntityId;
      }
      
      return postEventRepository.insert(eventData);
    }

    it('should return empty context for RESTART mode', async () => {
      const submissionId = await createSubmission();
      const priorRecord = await createPostRecordWithState(
        submissionId,
        PostRecordState.FAILED,
        PostRecordResumeMode.CONTINUE,
      );

      const context = await factory.buildResumeContext(
        submissionId,
        priorRecord.id,
        PostRecordResumeMode.RESTART,
      );

      expect(context.completedAccountIds.size).toBe(0);
      expect(context.postedFilesByAccount.size).toBe(0);
      expect(context.sourceUrlsByAccount.size).toBe(0);
    });

    it('should return empty context when no prior records exist', async () => {
      const submissionId = await createSubmission();
      const priorRecord = await postRecordRepository.insert({
        submissionId,
        state: PostRecordState.PENDING,
        resumeMode: PostRecordResumeMode.CONTINUE,
      });

      const context = await factory.buildResumeContext(
        submissionId,
        priorRecord.id,
        PostRecordResumeMode.CONTINUE,
      );

      expect(context.completedAccountIds.size).toBe(0);
      expect(context.postedFilesByAccount.size).toBe(0);
    });

    it('should aggregate completed accounts', async () => {
      const submissionId = await createSubmission();
      const account1 = await createAccount('account-1');
      const account2 = await createAccount('account-2');
      
      const failedRecord = await createPostRecordWithState(
        submissionId,
        PostRecordState.FAILED,
        PostRecordResumeMode.CONTINUE,
      );

      await addEvent(
        failedRecord.id,
        PostEventType.POST_ATTEMPT_COMPLETED,
        account1,
      );
      await addEvent(
        failedRecord.id,
        PostEventType.POST_ATTEMPT_COMPLETED,
        account2,
      );

      const context = await factory.buildResumeContext(
        submissionId,
        failedRecord.id,
        PostRecordResumeMode.CONTINUE_RETRY,
      );

      expect(context.completedAccountIds.size).toBe(2);
      expect(context.completedAccountIds.has(account1)).toBe(true);
      expect(context.completedAccountIds.has(account2)).toBe(true);
    });

    it('should aggregate posted files in CONTINUE mode', async () => {
      const submissionId = await createSubmission();
      const account1 = await createAccount('account-1');
      
      const failedRecord = await createPostRecordWithState(
        submissionId,
        PostRecordState.FAILED,
        PostRecordResumeMode.CONTINUE,
      );

      await addEvent(failedRecord.id, PostEventType.FILE_POSTED, account1, {
        fileId: 'file-1' as EntityId,
        sourceUrl: 'https://example.com/1',
      });
      await addEvent(failedRecord.id, PostEventType.FILE_POSTED, account1, {
        fileId: 'file-2' as EntityId,
        sourceUrl: 'https://example.com/2',
      });

      const context = await factory.buildResumeContext(
        submissionId,
        failedRecord.id,
        PostRecordResumeMode.CONTINUE,
      );

      expect(context.postedFilesByAccount.size).toBe(1);
      const postedFiles = context.postedFilesByAccount.get(account1);
      expect(postedFiles?.size).toBe(2);
      expect(postedFiles?.has('file-1' as EntityId)).toBe(true);
      expect(postedFiles?.has('file-2' as EntityId)).toBe(true);
    });

    it('should NOT aggregate posted files in CONTINUE_RETRY mode', async () => {
      const submissionId = await createSubmission();
      const account1 = await createAccount('account-1');
      
      const failedRecord = await createPostRecordWithState(
        submissionId,
        PostRecordState.FAILED,
        PostRecordResumeMode.CONTINUE,
      );

      await addEvent(
        failedRecord.id,
        PostEventType.FILE_POSTED,
        account1,
        {
          fileId: 'file-1' as EntityId,
        },
      );

      const context = await factory.buildResumeContext(
        submissionId,
        failedRecord.id,
        PostRecordResumeMode.CONTINUE_RETRY,
      );

      expect(context.postedFilesByAccount.size).toBe(0);
    });

    it('should aggregate source URLs from FILE_POSTED events', async () => {
      const submissionId = await createSubmission();
      const account1 = await createAccount('account-1');
      
      const failedRecord = await createPostRecordWithState(
        submissionId,
        PostRecordState.FAILED,
        PostRecordResumeMode.CONTINUE,
      );

      await addEvent(
        failedRecord.id,
        PostEventType.FILE_POSTED,
        account1,
        {
          sourceUrl: 'https://example.com/post1',
        },
      );

      const context = await factory.buildResumeContext(
        submissionId,
        failedRecord.id,
        PostRecordResumeMode.CONTINUE,
      );

      const sourceUrls = context.sourceUrlsByAccount.get(account1);
      expect(sourceUrls).toHaveLength(1);
      expect(sourceUrls?.[0]).toBe('https://example.com/post1');
    });

    it('should aggregate source URLs from MESSAGE_POSTED events', async () => {
      const submissionId = await createSubmission();
      const account1 = await createAccount('account-1');
      
      const failedRecord = await createPostRecordWithState(
        submissionId,
        PostRecordState.FAILED,
        PostRecordResumeMode.CONTINUE,
      );

      await addEvent(
        failedRecord.id,
        PostEventType.MESSAGE_POSTED,
        account1,
        {
          sourceUrl: 'https://example.com/message1',
        },
      );

      const context = await factory.buildResumeContext(
        submissionId,
        failedRecord.id,
        PostRecordResumeMode.CONTINUE,
      );

      const sourceUrls = context.sourceUrlsByAccount.get(account1);
      expect(sourceUrls).toHaveLength(1);
      expect(sourceUrls?.[0]).toBe('https://example.com/message1');
    });

    it('should stop aggregation at DONE record (not include it)', async () => {
      const submissionId = await createSubmission();
      const accountOld = await createAccount('account-old');
      const accountDone = await createAccount('account-done');
      const accountNew = await createAccount('account-new');

      // Create older FAILED record
      const olderFailedRecord = await createPostRecordWithState(
        submissionId,
        PostRecordState.FAILED,
        PostRecordResumeMode.CONTINUE,
      );
      await addEvent(
        olderFailedRecord.id,
        PostEventType.POST_ATTEMPT_COMPLETED,
        accountOld,
      );

      // Create DONE record (stop point)
      const doneRecord = await createPostRecordWithState(
        submissionId,
        PostRecordState.DONE,
        PostRecordResumeMode.CONTINUE,
      );
      await addEvent(
        doneRecord.id,
        PostEventType.POST_ATTEMPT_COMPLETED,
        accountDone,
      );

      // Create newer FAILED record
      const newerFailedRecord = await createPostRecordWithState(
        submissionId,
        PostRecordState.FAILED,
        PostRecordResumeMode.CONTINUE,
      );
      await addEvent(
        newerFailedRecord.id,
        PostEventType.POST_ATTEMPT_COMPLETED,
        accountNew,
      );

      const context = await factory.buildResumeContext(
        submissionId,
        newerFailedRecord.id,
        PostRecordResumeMode.CONTINUE_RETRY,
      );

      // Should only have account-new, not account-done or account-old
      expect(context.completedAccountIds.size).toBe(1);
      expect(context.completedAccountIds.has(accountNew)).toBe(true);
      expect(context.completedAccountIds.has(accountDone)).toBe(false);
      expect(context.completedAccountIds.has(accountOld)).toBe(false);
    });

    it('should stop at RESTART record but include its events', async () => {
      const submissionId = await createSubmission();
      const accountOld = await createAccount('account-old');
      const accountRestart = await createAccount('account-restart');
      const accountNew = await createAccount('account-new');

      // Create older FAILED record
      const olderFailedRecord = await createPostRecordWithState(
        submissionId,
        PostRecordState.FAILED,
        PostRecordResumeMode.CONTINUE,
      );
      await addEvent(
        olderFailedRecord.id,
        PostEventType.POST_ATTEMPT_COMPLETED,
        accountOld,
      );

      // Create RESTART record (stop point but include it)
      const restartRecord = await createPostRecordWithState(
        submissionId,
        PostRecordState.FAILED,
        PostRecordResumeMode.RESTART,
      );
      await addEvent(
        restartRecord.id,
        PostEventType.POST_ATTEMPT_COMPLETED,
        accountRestart,
      );

      // Create newer FAILED record
      const newerFailedRecord = await createPostRecordWithState(
        submissionId,
        PostRecordState.FAILED,
        PostRecordResumeMode.CONTINUE,
      );
      await addEvent(
        newerFailedRecord.id,
        PostEventType.POST_ATTEMPT_COMPLETED,
        accountNew,
      );

      const context = await factory.buildResumeContext(
        submissionId,
        newerFailedRecord.id,
        PostRecordResumeMode.CONTINUE_RETRY,
      );

      // Should have account-new and account-restart, but NOT account-old
      expect(context.completedAccountIds.size).toBe(2);
      expect(context.completedAccountIds.has(accountNew)).toBe(true);
      expect(context.completedAccountIds.has(accountRestart)).toBe(true);
      expect(context.completedAccountIds.has(accountOld)).toBe(false);
    });

    it('should aggregate events from multiple FAILED records', async () => {
      const submissionId = await createSubmission();
      const account1 = await createAccount('account-1');
      const account2 = await createAccount('account-2');
      const account3 = await createAccount('account-3');

      const failed1 = await createPostRecordWithState(
        submissionId,
        PostRecordState.FAILED,
        PostRecordResumeMode.CONTINUE,
      );
      await addEvent(
        failed1.id,
        PostEventType.POST_ATTEMPT_COMPLETED,
        account1,
      );

      const failed2 = await createPostRecordWithState(
        submissionId,
        PostRecordState.FAILED,
        PostRecordResumeMode.CONTINUE,
      );
      await addEvent(
        failed2.id,
        PostEventType.POST_ATTEMPT_COMPLETED,
        account2,
      );

      const failed3 = await createPostRecordWithState(
        submissionId,
        PostRecordState.FAILED,
        PostRecordResumeMode.CONTINUE,
      );
      await addEvent(
        failed3.id,
        PostEventType.POST_ATTEMPT_COMPLETED,
        account3,
      );

      const context = await factory.buildResumeContext(
        submissionId,
        failed3.id,
        PostRecordResumeMode.CONTINUE_RETRY,
      );

      expect(context.completedAccountIds.size).toBe(3);
      expect(context.completedAccountIds.has(account1)).toBe(true);
      expect(context.completedAccountIds.has(account2)).toBe(true);
      expect(context.completedAccountIds.has(account3)).toBe(true);
    });
  });

  describe('shouldSkipAccount', () => {
    it('should return true for completed accounts', () => {
      const context: ResumeContext = {
        priorPostRecordId: 'prior-1' as EntityId,
        resumeMode: PostRecordResumeMode.CONTINUE_RETRY,
        completedAccountIds: new Set(['account-1' as EntityId]),
        postedFilesByAccount: new Map(),
        sourceUrlsByAccount: new Map(),
      };

      expect(factory.shouldSkipAccount(context, 'account-1' as EntityId)).toBe(
        true,
      );
    });

    it('should return false for non-completed accounts', () => {
      const context: ResumeContext = {
        priorPostRecordId: 'prior-1' as EntityId,
        resumeMode: PostRecordResumeMode.CONTINUE_RETRY,
        completedAccountIds: new Set(['account-1' as EntityId]),
        postedFilesByAccount: new Map(),
        sourceUrlsByAccount: new Map(),
      };

      expect(factory.shouldSkipAccount(context, 'account-2' as EntityId)).toBe(
        false,
      );
    });
  });

  describe('shouldSkipFile', () => {
    it('should return false in RESTART mode', () => {
      const context: ResumeContext = {
        priorPostRecordId: 'prior-1' as EntityId,
        resumeMode: PostRecordResumeMode.RESTART,
        completedAccountIds: new Set(),
        postedFilesByAccount: new Map(),
        sourceUrlsByAccount: new Map(),
      };

      expect(
        factory.shouldSkipFile(
          context,
          'account-1' as EntityId,
          'file-1' as EntityId,
        ),
      ).toBe(false);
    });

    it('should return false in CONTINUE_RETRY mode', () => {
      const context: ResumeContext = {
        priorPostRecordId: 'prior-1' as EntityId,
        resumeMode: PostRecordResumeMode.CONTINUE_RETRY,
        completedAccountIds: new Set(),
        postedFilesByAccount: new Map([
          ['account-1' as EntityId, new Set(['file-1' as EntityId])],
        ]),
        sourceUrlsByAccount: new Map(),
      };

      expect(
        factory.shouldSkipFile(
          context,
          'account-1' as EntityId,
          'file-1' as EntityId,
        ),
      ).toBe(false);
    });

    it('should return true for posted files in CONTINUE mode', () => {
      const context: ResumeContext = {
        priorPostRecordId: 'prior-1' as EntityId,
        resumeMode: PostRecordResumeMode.CONTINUE,
        completedAccountIds: new Set(),
        postedFilesByAccount: new Map([
          ['account-1' as EntityId, new Set(['file-1' as EntityId])],
        ]),
        sourceUrlsByAccount: new Map(),
      };

      expect(
        factory.shouldSkipFile(
          context,
          'account-1' as EntityId,
          'file-1' as EntityId,
        ),
      ).toBe(true);
    });

    it('should return false for non-posted files in CONTINUE mode', () => {
      const context: ResumeContext = {
        priorPostRecordId: 'prior-1' as EntityId,
        resumeMode: PostRecordResumeMode.CONTINUE,
        completedAccountIds: new Set(),
        postedFilesByAccount: new Map([
          ['account-1' as EntityId, new Set(['file-1' as EntityId])],
        ]),
        sourceUrlsByAccount: new Map(),
      };

      expect(
        factory.shouldSkipFile(
          context,
          'account-1' as EntityId,
          'file-2' as EntityId,
        ),
      ).toBe(false);
    });
  });

  describe('getSourceUrlsForAccount', () => {
    it('should return source URLs for an account', () => {
      const context: ResumeContext = {
        priorPostRecordId: 'prior-1' as EntityId,
        resumeMode: PostRecordResumeMode.CONTINUE,
        completedAccountIds: new Set(),
        postedFilesByAccount: new Map(),
        sourceUrlsByAccount: new Map([
          [
            'account-1' as EntityId,
            ['https://example.com/1', 'https://example.com/2'],
          ],
        ]),
      };

      const urls = factory.getSourceUrlsForAccount(
        context,
        'account-1' as EntityId,
      );
      expect(urls).toHaveLength(2);
      expect(urls[0]).toBe('https://example.com/1');
      expect(urls[1]).toBe('https://example.com/2');
    });

    it('should return empty array for account with no URLs', () => {
      const context: ResumeContext = {
        priorPostRecordId: 'prior-1' as EntityId,
        resumeMode: PostRecordResumeMode.CONTINUE,
        completedAccountIds: new Set(),
        postedFilesByAccount: new Map(),
        sourceUrlsByAccount: new Map(),
      };

      const urls = factory.getSourceUrlsForAccount(
        context,
        'account-1' as EntityId,
      );
      expect(urls).toHaveLength(0);
    });
  });

  describe('getAllSourceUrls', () => {
    it('should return all source URLs from all accounts', () => {
      const context: ResumeContext = {
        priorPostRecordId: 'prior-1' as EntityId,
        resumeMode: PostRecordResumeMode.CONTINUE,
        completedAccountIds: new Set(),
        postedFilesByAccount: new Map(),
        sourceUrlsByAccount: new Map([
          ['account-1' as EntityId, ['https://example.com/1']],
          ['account-2' as EntityId, ['https://example.com/2']],
        ]),
      };

      const urls = factory.getAllSourceUrls(context);
      expect(urls).toHaveLength(2);
      expect(urls).toContain('https://example.com/1');
      expect(urls).toContain('https://example.com/2');
    });

    it('should return empty array when no URLs exist', () => {
      const context: ResumeContext = {
        priorPostRecordId: 'prior-1' as EntityId,
        resumeMode: PostRecordResumeMode.CONTINUE,
        completedAccountIds: new Set(),
        postedFilesByAccount: new Map(),
        sourceUrlsByAccount: new Map(),
      };

      const urls = factory.getAllSourceUrls(context);
      expect(urls).toHaveLength(0);
    });
  });
});
