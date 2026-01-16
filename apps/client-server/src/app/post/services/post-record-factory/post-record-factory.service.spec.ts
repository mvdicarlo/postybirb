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
import { InvalidPostChainError } from '../../errors';
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

  describe('create', () => {
    it('should create a PostRecord with default NEW mode and null originPostRecordId', async () => {
      const submissionId = await createSubmission();
      const record = await factory.create(submissionId);

      expect(record).toBeDefined();
      expect(record.submissionId).toBe(submissionId);
      expect(record.state).toBe(PostRecordState.PENDING);
      expect(record.resumeMode).toBe(PostRecordResumeMode.NEW);
      expect(record.originPostRecordId).toBeNull();
      expect(record.id).toBeDefined();
      expect(record.createdAt).toBeDefined();
    });

    it('should create multiple records for different submissions', async () => {
      const submission1 = await createSubmission();
      const submission2 = await createSubmission();

      const record1 = await factory.create(submission1);
      const record2 = await factory.create(submission2);

      expect(record1.submissionId).toBe(submission1);
      expect(record2.submissionId).toBe(submission2);
      expect(record1.id).not.toBe(record2.id);
      expect(record1.originPostRecordId).toBeNull();
      expect(record2.originPostRecordId).toBeNull();
    });

    it('should set originPostRecordId when creating CONTINUE record', async () => {
      const submissionId = await createSubmission();

      // Create origin NEW record first
      const originRecord = await factory.create(submissionId, PostRecordResumeMode.NEW);
      
      // Mark it as FAILED so CONTINUE is valid
      await postRecordRepository.update(originRecord.id, { state: PostRecordState.FAILED });

      const continueRecord = await factory.create(submissionId, PostRecordResumeMode.CONTINUE);

      expect(continueRecord.resumeMode).toBe(PostRecordResumeMode.CONTINUE);
      expect(continueRecord.originPostRecordId).toBe(originRecord.id);
    });

    it('should set originPostRecordId when creating CONTINUE_RETRY record', async () => {
      const submissionId = await createSubmission();

      // Create origin NEW record first
      const originRecord = await factory.create(submissionId, PostRecordResumeMode.NEW);
      
      // Mark it as FAILED so CONTINUE_RETRY is valid
      await postRecordRepository.update(originRecord.id, { state: PostRecordState.FAILED });

      const retryRecord = await factory.create(submissionId, PostRecordResumeMode.CONTINUE_RETRY);

      expect(retryRecord.resumeMode).toBe(PostRecordResumeMode.CONTINUE_RETRY);
      expect(retryRecord.originPostRecordId).toBe(originRecord.id);
    });

    it('should throw InvalidPostChainError for CONTINUE without any origin', async () => {
      const submissionId = await createSubmission();

      await expect(
        factory.create(submissionId, PostRecordResumeMode.CONTINUE),
      ).rejects.toThrow(InvalidPostChainError);

      try {
        await factory.create(submissionId, PostRecordResumeMode.CONTINUE);
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidPostChainError);
        expect((error as InvalidPostChainError).reason).toBe('no_origin');
      }
    });

    it('should throw InvalidPostChainError for CONTINUE_RETRY without any origin', async () => {
      const submissionId = await createSubmission();

      await expect(
        factory.create(submissionId, PostRecordResumeMode.CONTINUE_RETRY),
      ).rejects.toThrow(InvalidPostChainError);

      try {
        await factory.create(submissionId, PostRecordResumeMode.CONTINUE_RETRY);
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidPostChainError);
        expect((error as InvalidPostChainError).reason).toBe('no_origin');
      }
    });

    it('should throw InvalidPostChainError when origin is DONE', async () => {
      const submissionId = await createSubmission();

      // Create origin NEW record and mark it DONE (closed chain)
      const originRecord = await factory.create(submissionId, PostRecordResumeMode.NEW);
      await postRecordRepository.update(originRecord.id, { state: PostRecordState.DONE });

      await expect(
        factory.create(submissionId, PostRecordResumeMode.CONTINUE),
      ).rejects.toThrow(InvalidPostChainError);

      try {
        await factory.create(submissionId, PostRecordResumeMode.CONTINUE);
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidPostChainError);
        expect((error as InvalidPostChainError).reason).toBe('origin_done');
      }
    });

    it('should chain to most recent NEW record, not older ones', async () => {
      const submissionId = await createSubmission();

      // Create first NEW record and mark it DONE
      const oldOrigin = await factory.create(submissionId, PostRecordResumeMode.NEW);
      await postRecordRepository.update(oldOrigin.id, { state: PostRecordState.DONE });

      // Create second NEW record (new chain)
      const newOrigin = await factory.create(submissionId, PostRecordResumeMode.NEW);
      await postRecordRepository.update(newOrigin.id, { state: PostRecordState.FAILED });

      // CONTINUE should chain to the newer origin
      const continueRecord = await factory.create(submissionId, PostRecordResumeMode.CONTINUE);

      expect(continueRecord.originPostRecordId).toBe(newOrigin.id);
      expect(continueRecord.originPostRecordId).not.toBe(oldOrigin.id);
    });

    it('should throw InvalidPostChainError when PENDING record exists for submission', async () => {
      const submissionId = await createSubmission();

      // Create a PENDING record (simulating one already in the queue)
      await postRecordRepository.insert({
        submissionId,
        state: PostRecordState.PENDING,
        resumeMode: PostRecordResumeMode.NEW,
        originPostRecordId: null,
      });

      // Attempting to create another should fail
      await expect(
        factory.create(submissionId, PostRecordResumeMode.NEW),
      ).rejects.toThrow(InvalidPostChainError);

      try {
        await factory.create(submissionId, PostRecordResumeMode.NEW);
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidPostChainError);
        expect((error as InvalidPostChainError).reason).toBe('in_progress');
      }
    });

    it('should throw InvalidPostChainError when RUNNING record exists for submission', async () => {
      const submissionId = await createSubmission();

      // Create a RUNNING record (simulating one currently being processed)
      await postRecordRepository.insert({
        submissionId,
        state: PostRecordState.RUNNING,
        resumeMode: PostRecordResumeMode.NEW,
        originPostRecordId: null,
      });

      // Attempting to create another should fail
      await expect(
        factory.create(submissionId, PostRecordResumeMode.NEW),
      ).rejects.toThrow(InvalidPostChainError);

      try {
        await factory.create(submissionId, PostRecordResumeMode.NEW);
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidPostChainError);
        expect((error as InvalidPostChainError).reason).toBe('in_progress');
      }
    });

    it('should allow creating NEW record when prior records are FAILED or DONE', async () => {
      const submissionId = await createSubmission();

      // Create a FAILED record
      await postRecordRepository.insert({
        submissionId,
        state: PostRecordState.FAILED,
        resumeMode: PostRecordResumeMode.NEW,
        originPostRecordId: null,
      });

      // Create a DONE record
      await postRecordRepository.insert({
        submissionId,
        state: PostRecordState.DONE,
        resumeMode: PostRecordResumeMode.NEW,
        originPostRecordId: null,
      });

      // Creating a NEW record should succeed (no PENDING/RUNNING blocking)
      const record = await factory.create(submissionId, PostRecordResumeMode.NEW);
      expect(record).toBeDefined();
      expect(record.state).toBe(PostRecordState.PENDING);
    });
  });

  describe('buildResumeContext', () => {
    async function createPostRecordWithState(
      submissionId: EntityId,
      state: PostRecordState,
      resumeMode: PostRecordResumeMode,
      originPostRecordId?: EntityId,
    ): Promise<PostRecord> {
      const record = await postRecordRepository.insert({
        submissionId,
        state,
        resumeMode,
        originPostRecordId: originPostRecordId ?? null,
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

    it('should return empty context for NEW mode', async () => {
      const submissionId = await createSubmission();
      // Create an origin NEW record first
      const originRecord = await createPostRecordWithState(
        submissionId,
        PostRecordState.FAILED,
        PostRecordResumeMode.NEW,
      );
      // Create a CONTINUE record chained to it
      const priorRecord = await createPostRecordWithState(
        submissionId,
        PostRecordState.FAILED,
        PostRecordResumeMode.CONTINUE,
        originRecord.id,
      );

      const context = await factory.buildResumeContext(
        submissionId,
        priorRecord.id,
        PostRecordResumeMode.NEW,
      );

      expect(context.completedAccountIds.size).toBe(0);
      expect(context.postedFilesByAccount.size).toBe(0);
      expect(context.sourceUrlsByAccount.size).toBe(0);
    });

    it('should return empty context when no prior records exist', async () => {
      const submissionId = await createSubmission();
      // Create a NEW record with no chain
      const priorRecord = await createPostRecordWithState(
        submissionId,
        PostRecordState.PENDING,
        PostRecordResumeMode.NEW,
      );

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
      
      // Create origin NEW record
      const originRecord = await createPostRecordWithState(
        submissionId,
        PostRecordState.FAILED,
        PostRecordResumeMode.NEW,
      );

      await addEvent(
        originRecord.id,
        PostEventType.POST_ATTEMPT_COMPLETED,
        account1,
      );
      await addEvent(
        originRecord.id,
        PostEventType.POST_ATTEMPT_COMPLETED,
        account2,
      );

      const context = await factory.buildResumeContext(
        submissionId,
        originRecord.id,
        PostRecordResumeMode.CONTINUE_RETRY,
      );

      expect(context.completedAccountIds.size).toBe(2);
      expect(context.completedAccountIds.has(account1)).toBe(true);
      expect(context.completedAccountIds.has(account2)).toBe(true);
    });

    it('should aggregate posted files in CONTINUE mode', async () => {
      const submissionId = await createSubmission();
      const account1 = await createAccount('account-1');
      
      // Create origin NEW record
      const originRecord = await createPostRecordWithState(
        submissionId,
        PostRecordState.FAILED,
        PostRecordResumeMode.NEW,
      );

      await addEvent(originRecord.id, PostEventType.FILE_POSTED, account1, {
        fileId: 'file-1' as EntityId,
        sourceUrl: 'https://example.com/1',
      });
      await addEvent(originRecord.id, PostEventType.FILE_POSTED, account1, {
        fileId: 'file-2' as EntityId,
        sourceUrl: 'https://example.com/2',
      });

      const context = await factory.buildResumeContext(
        submissionId,
        originRecord.id,
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
      
      // Create origin NEW record
      const originRecord = await createPostRecordWithState(
        submissionId,
        PostRecordState.FAILED,
        PostRecordResumeMode.NEW,
      );

      await addEvent(
        originRecord.id,
        PostEventType.FILE_POSTED,
        account1,
        {
          fileId: 'file-1' as EntityId,
        },
      );

      const context = await factory.buildResumeContext(
        submissionId,
        originRecord.id,
        PostRecordResumeMode.CONTINUE_RETRY,
      );

      expect(context.postedFilesByAccount.size).toBe(0);
    });

    it('should aggregate source URLs from FILE_POSTED events', async () => {
      const submissionId = await createSubmission();
      const account1 = await createAccount('account-1');
      
      // Create origin NEW record
      const originRecord = await createPostRecordWithState(
        submissionId,
        PostRecordState.FAILED,
        PostRecordResumeMode.NEW,
      );

      await addEvent(
        originRecord.id,
        PostEventType.FILE_POSTED,
        account1,
        {
          sourceUrl: 'https://example.com/post1',
        },
      );

      const context = await factory.buildResumeContext(
        submissionId,
        originRecord.id,
        PostRecordResumeMode.CONTINUE,
      );

      const sourceUrls = context.sourceUrlsByAccount.get(account1);
      expect(sourceUrls).toHaveLength(1);
      expect(sourceUrls?.[0]).toBe('https://example.com/post1');
    });

    it('should aggregate source URLs from MESSAGE_POSTED events', async () => {
      const submissionId = await createSubmission();
      const account1 = await createAccount('account-1');
      
      // Create origin NEW record
      const originRecord = await createPostRecordWithState(
        submissionId,
        PostRecordState.FAILED,
        PostRecordResumeMode.NEW,
      );

      await addEvent(
        originRecord.id,
        PostEventType.MESSAGE_POSTED,
        account1,
        {
          sourceUrl: 'https://example.com/message1',
        },
      );

      const context = await factory.buildResumeContext(
        submissionId,
        originRecord.id,
        PostRecordResumeMode.CONTINUE,
      );

      const sourceUrls = context.sourceUrlsByAccount.get(account1);
      expect(sourceUrls).toHaveLength(1);
      expect(sourceUrls?.[0]).toBe('https://example.com/message1');
    });

    it('should only aggregate events from current chain (not prior DONE chain)', async () => {
      const submissionId = await createSubmission();
      const accountOld = await createAccount('account-old');
      const accountNew = await createAccount('account-new');

      // Create older chain that completed successfully (DONE)
      const olderOrigin = await createPostRecordWithState(
        submissionId,
        PostRecordState.DONE,
        PostRecordResumeMode.NEW,
      );
      await addEvent(
        olderOrigin.id,
        PostEventType.POST_ATTEMPT_COMPLETED,
        accountOld,
      );

      // Create new chain origin
      const newOrigin = await createPostRecordWithState(
        submissionId,
        PostRecordState.FAILED,
        PostRecordResumeMode.NEW,
      );
      await addEvent(
        newOrigin.id,
        PostEventType.POST_ATTEMPT_COMPLETED,
        accountNew,
      );

      const context = await factory.buildResumeContext(
        submissionId,
        newOrigin.id,
        PostRecordResumeMode.CONTINUE_RETRY,
      );

      // Should only have account-new from the current chain
      expect(context.completedAccountIds.size).toBe(1);
      expect(context.completedAccountIds.has(accountNew)).toBe(true);
      expect(context.completedAccountIds.has(accountOld)).toBe(false);
    });

    it('should aggregate events from origin and all chained records', async () => {
      const submissionId = await createSubmission();
      const accountRestart = await createAccount('account-restart');
      const accountNew = await createAccount('account-new');

      // Create NEW record (origin)
      const originRecord = await createPostRecordWithState(
        submissionId,
        PostRecordState.FAILED,
        PostRecordResumeMode.NEW,
      );
      await addEvent(
        originRecord.id,
        PostEventType.POST_ATTEMPT_COMPLETED,
        accountRestart,
      );

      // Create CONTINUE record chained to origin
      const continueRecord = await createPostRecordWithState(
        submissionId,
        PostRecordState.FAILED,
        PostRecordResumeMode.CONTINUE,
        originRecord.id,
      );
      await addEvent(
        continueRecord.id,
        PostEventType.POST_ATTEMPT_COMPLETED,
        accountNew,
      );

      const context = await factory.buildResumeContext(
        submissionId,
        continueRecord.id,
        PostRecordResumeMode.CONTINUE_RETRY,
      );

      // Should have both accounts from the chain
      expect(context.completedAccountIds.size).toBe(2);
      expect(context.completedAccountIds.has(accountNew)).toBe(true);
      expect(context.completedAccountIds.has(accountRestart)).toBe(true);
    });

    it('should aggregate events from multiple chained FAILED records', async () => {
      const submissionId = await createSubmission();
      const account1 = await createAccount('account-1');
      const account2 = await createAccount('account-2');
      const account3 = await createAccount('account-3');

      // Create origin NEW record
      const originRecord = await createPostRecordWithState(
        submissionId,
        PostRecordState.FAILED,
        PostRecordResumeMode.NEW,
      );
      await addEvent(
        originRecord.id,
        PostEventType.POST_ATTEMPT_COMPLETED,
        account1,
      );

      // Create first CONTINUE chained to origin
      const continue1 = await createPostRecordWithState(
        submissionId,
        PostRecordState.FAILED,
        PostRecordResumeMode.CONTINUE,
        originRecord.id,
      );
      await addEvent(
        continue1.id,
        PostEventType.POST_ATTEMPT_COMPLETED,
        account2,
      );

      // Create second CONTINUE chained to origin
      const continue2 = await createPostRecordWithState(
        submissionId,
        PostRecordState.FAILED,
        PostRecordResumeMode.CONTINUE,
        originRecord.id,
      );
      await addEvent(
        continue2.id,
        PostEventType.POST_ATTEMPT_COMPLETED,
        account3,
      );

      const context = await factory.buildResumeContext(
        submissionId,
        continue2.id,
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
    it('should return false in NEW mode', () => {
      const context: ResumeContext = {
        resumeMode: PostRecordResumeMode.NEW,
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
        resumeMode: PostRecordResumeMode.CONTINUE,
        completedAccountIds: new Set(),
        postedFilesByAccount: new Map(),
        sourceUrlsByAccount: new Map(),
      };

      const urls = factory.getAllSourceUrls(context);
      expect(urls).toHaveLength(0);
    });
  });

  describe('crash recovery', () => {
    /**
     * These tests verify the crash recovery behavior:
     * When PostyBirb crashes mid-post, a PostRecord is left in RUNNING state.
     * On restart, onModuleInit() finds these RUNNING records and resumes them.
     * The key behavior is that events from the RUNNING record must be preserved,
     * EVEN if the user originally requested NEW mode (fresh start).
     */

    async function createPostRecordWithState(
      submissionId: EntityId,
      state: PostRecordState,
      resumeMode: PostRecordResumeMode,
      originPostRecordId?: EntityId,
    ): Promise<PostRecord> {
      const record = await postRecordRepository.insert({
        submissionId,
        state,
        resumeMode,
        originPostRecordId: originPostRecordId ?? null,
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
      if (accountId) {
        eventData.accountId = accountId as EntityId;
      }
      return postEventRepository.insert(eventData);
    }

    it('should aggregate events from RUNNING record even with NEW mode (crash recovery)', async () => {
      // Scenario: User started a NEW post, posted to 2 accounts, then crashed.
      // On restart, we must preserve those 2 completed accounts.
      const submissionId = await createSubmission();
      const account1 = await createAccount('crash-account-1');
      const account2 = await createAccount('crash-account-2');

      // Create a RUNNING record with NEW mode (simulates mid-post crash)
      // NEW mode records are their own origin (originPostRecordId = null)
      const runningRecord = await createPostRecordWithState(
        submissionId,
        PostRecordState.RUNNING,
        PostRecordResumeMode.NEW,
      );

      // Add events that occurred before crash
      await addEvent(runningRecord.id, PostEventType.POST_ATTEMPT_COMPLETED, account1);
      await addEvent(runningRecord.id, PostEventType.POST_ATTEMPT_COMPLETED, account2);
      await addEvent(runningRecord.id, PostEventType.FILE_POSTED, account1, {
        fileId: 'crash-file-1' as EntityId,
        sourceUrl: 'https://example.com/crash-1',
      });

      // Simulate crash recovery: buildResumeContext is called with NEW mode
      // but the record is still RUNNING (not terminal)
      const context = await factory.buildResumeContext(
        submissionId,
        runningRecord.id,
        PostRecordResumeMode.NEW,
      );

      // Despite NEW mode, crash recovery should preserve completed accounts
      expect(context.completedAccountIds.size).toBe(2);
      expect(context.completedAccountIds.has(account1)).toBe(true);
      expect(context.completedAccountIds.has(account2)).toBe(true);

      // Crash recovery with NEW mode should include posted files to avoid re-uploading
      expect(context.postedFilesByAccount.size).toBe(1);
      const postedFiles = context.postedFilesByAccount.get(account1);
      expect(postedFiles?.has('crash-file-1' as EntityId)).toBe(true);
    });

    it('should return empty context for NEW mode with terminal (FAILED/DONE) record', async () => {
      // Normal NEW behavior: if the prior record is terminal, start fresh
      const submissionId = await createSubmission();
      const account1 = await createAccount('terminal-account-1');

      // Create origin NEW record that failed
      const originRecord = await createPostRecordWithState(
        submissionId,
        PostRecordState.FAILED,
        PostRecordResumeMode.NEW,
      );

      // Create a CONTINUE record chained to it
      const failedRecord = await createPostRecordWithState(
        submissionId,
        PostRecordState.FAILED,
        PostRecordResumeMode.CONTINUE,
        originRecord.id,
      );

      await addEvent(failedRecord.id, PostEventType.POST_ATTEMPT_COMPLETED, account1);

      // NEW mode with a FAILED record should return empty context
      const context = await factory.buildResumeContext(
        submissionId,
        failedRecord.id,
        PostRecordResumeMode.NEW,
      );

      expect(context.completedAccountIds.size).toBe(0);
      expect(context.postedFilesByAccount.size).toBe(0);
    });

    it('should aggregate events from RUNNING record with CONTINUE mode (crash recovery)', async () => {
      // CONTINUE mode crash recovery should also work
      const submissionId = await createSubmission();
      const account1 = await createAccount('continue-crash-account-1');

      // Create origin NEW record
      const originRecord = await createPostRecordWithState(
        submissionId,
        PostRecordState.FAILED,
        PostRecordResumeMode.NEW,
      );

      // Create RUNNING CONTINUE record chained to origin
      const runningRecord = await createPostRecordWithState(
        submissionId,
        PostRecordState.RUNNING,
        PostRecordResumeMode.CONTINUE,
        originRecord.id,
      );

      await addEvent(runningRecord.id, PostEventType.POST_ATTEMPT_COMPLETED, account1);
      await addEvent(runningRecord.id, PostEventType.FILE_POSTED, account1, {
        fileId: 'continue-crash-file-1' as EntityId,
      });

      const context = await factory.buildResumeContext(
        submissionId,
        runningRecord.id,
        PostRecordResumeMode.CONTINUE,
      );

      // CONTINUE mode crash recovery should include both completed accounts and posted files
      expect(context.completedAccountIds.size).toBe(1);
      expect(context.completedAccountIds.has(account1)).toBe(true);
      expect(context.postedFilesByAccount.size).toBe(1);
      const postedFiles = context.postedFilesByAccount.get(account1);
      expect(postedFiles?.has('continue-crash-file-1' as EntityId)).toBe(true);
    });

    it('should combine RUNNING record with prior FAILED records in CONTINUE mode', async () => {
      // Scenario: Previous attempt failed, user chose CONTINUE, then crashed mid-post.
      // We need to aggregate from both the RUNNING record AND the prior FAILED record.
      const submissionId = await createSubmission();
      const account1 = await createAccount('prior-account-1');
      const account2 = await createAccount('current-account-2');

      // Create origin NEW record
      const originRecord = await createPostRecordWithState(
        submissionId,
        PostRecordState.FAILED,
        PostRecordResumeMode.NEW,
      );
      await addEvent(originRecord.id, PostEventType.POST_ATTEMPT_COMPLETED, account1);
      await addEvent(originRecord.id, PostEventType.FILE_POSTED, account1, {
        fileId: 'prior-file-1' as EntityId,
      });

      // Second attempt: CONTINUE from prior, posted to account2, then crashed
      const runningRecord = await createPostRecordWithState(
        submissionId,
        PostRecordState.RUNNING,
        PostRecordResumeMode.CONTINUE,
        originRecord.id,
      );
      await addEvent(runningRecord.id, PostEventType.POST_ATTEMPT_COMPLETED, account2);
      await addEvent(runningRecord.id, PostEventType.FILE_POSTED, account2, {
        fileId: 'current-file-1' as EntityId,
      });

      const context = await factory.buildResumeContext(
        submissionId,
        runningRecord.id,
        PostRecordResumeMode.CONTINUE,
      );

      // Should include completed accounts from both records
      expect(context.completedAccountIds.size).toBe(2);
      expect(context.completedAccountIds.has(account1)).toBe(true);
      expect(context.completedAccountIds.has(account2)).toBe(true);

      // Should include posted files from both records
      expect(context.postedFilesByAccount.size).toBe(2);
      expect(context.postedFilesByAccount.get(account1)?.has('prior-file-1' as EntityId)).toBe(true);
      expect(context.postedFilesByAccount.get(account2)?.has('current-file-1' as EntityId)).toBe(true);
    });

    it('should preserve source URLs from RUNNING record in crash recovery', async () => {
      const submissionId = await createSubmission();
      const account1 = await createAccount('url-crash-account-1');

      // Create RUNNING NEW record (origin with crash)
      const runningRecord = await createPostRecordWithState(
        submissionId,
        PostRecordState.RUNNING,
        PostRecordResumeMode.NEW,
      );

      await addEvent(runningRecord.id, PostEventType.FILE_POSTED, account1, {
        fileId: 'url-file-1' as EntityId,
        sourceUrl: 'https://example.com/posted-before-crash',
      });

      const context = await factory.buildResumeContext(
        submissionId,
        runningRecord.id,
        PostRecordResumeMode.NEW,
      );

      // Source URLs should be preserved for NEW mode crash recovery
      expect(context.sourceUrlsByAccount.size).toBe(1);
      const urls = context.sourceUrlsByAccount.get(account1);
      expect(urls).toContain('https://example.com/posted-before-crash');
    });
  });
});
