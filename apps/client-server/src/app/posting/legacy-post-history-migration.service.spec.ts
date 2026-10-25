import {
  AccountSchema,
  clearDatabase,
  getDatabase,
  PostEventSchema,
  PostRecordSchema,
  PostRepository,
  PostSchema,
  SubmissionFileSchema,
  SubmissionSchema,
} from '@postybirb/database';
import {
  PostEventType,
  PostRecordResumeMode,
  PostRecordState,
  ScheduleType,
  SubmissionType,
  UnitOfWorkState,
} from '@postybirb/types';
import { LegacyPostHistoryMigrationService } from './legacy-post-history-migration.service';

describe(LegacyPostHistoryMigrationService.name, () => {
  beforeEach(() => clearDatabase());
  afterEach(() => {
    jest.restoreAllMocks();
    clearDatabase();
  });

  async function seedSubmission(id: string) {
    const db = getDatabase();
    await db.insert(SubmissionSchema).values({
      id,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      type: SubmissionType.MESSAGE,
      dependsOn: [],
      isArchived: true,
      isInitialized: true,
      isMultiSubmission: false,
      isScheduled: false,
      isTemplate: false,
      metadata: {},
      order: 0,
      schedule: { scheduleType: ScheduleType.NONE },
    });
  }

  async function seedAccount(id: string) {
    await getDatabase().insert(AccountSchema).values({
      id,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      groups: [],
      name: 'Legacy account',
      website: 'test',
    });
  }

  async function seedRecord(id: string, submissionId: string | null) {
    await getDatabase().insert(PostRecordSchema).values({
      id,
      submissionId,
      resumeMode: PostRecordResumeMode.NEW,
      state: PostRecordState.DONE,
    });
  }

  it.each(Object.values(PostRecordState))(
    'preserves outcomes without re-queuing a %s legacy attempt',
    async (state) => {
      const db = getDatabase();
      const submissionId = 'legacy-submission';
      const accountId = 'legacy-account';
      const originId = 'legacy-origin';
      const retryId = 'legacy-retry';

      await seedSubmission(submissionId);
      await seedAccount(accountId);
      await db.insert(PostRecordSchema).values([
        {
          id: originId,
          createdAt: '2026-01-01T00:01:00.000Z',
          updatedAt: '2026-01-01T00:02:00.000Z',
          submissionId,
          resumeMode: PostRecordResumeMode.NEW,
          state: PostRecordState.DONE,
        },
        {
          id: retryId,
          createdAt: '2026-01-01T00:03:00.000Z',
          updatedAt: '2026-01-01T00:04:00.000Z',
          submissionId,
          originPostRecordId: originId,
          resumeMode: PostRecordResumeMode.CONTINUE_RETRY,
          state,
        },
      ]);
      await db.insert(PostEventSchema).values([
        {
          id: 'origin-started',
          createdAt: '2026-01-01T00:01:10.000Z',
          postRecordId: originId,
          accountId,
          eventType: PostEventType.POST_ATTEMPT_STARTED,
          metadata: {
            accountSnapshot: { name: 'Legacy account', website: 'test' },
          },
        },
        {
          id: 'origin-posted',
          createdAt: '2026-01-01T00:01:20.000Z',
          postRecordId: originId,
          accountId,
          eventType: PostEventType.MESSAGE_POSTED,
          sourceUrl: 'https://example.com/legacy-post',
          metadata: { responseMessage: 'Posted' },
        },
        {
          id: 'retry-failed',
          createdAt: '2026-01-01T00:03:20.000Z',
          postRecordId: retryId,
          accountId,
          eventType: PostEventType.MESSAGE_FAILED,
          error: {
            message: 'Legacy failure',
            stage: 'post',
            stack: 'legacy stack',
          },
        },
        {
          id: 'retry-attempt-failed',
          createdAt: '2026-01-01T00:03:30.000Z',
          postRecordId: retryId,
          accountId,
          eventType: PostEventType.POST_ATTEMPT_FAILED,
          error: { message: 'Duplicate lifecycle failure' },
        },
      ]);

      const migration = new LegacyPostHistoryMigrationService();
      const firstRun = await migration.migrate();
      const post = await new PostRepository().findOne({
        where: (table, { eq }) => eq(table.submissionId, submissionId),
      });

      expect(firstRun).toEqual(
        expect.objectContaining({ postsCreated: 1, unitsCreated: 2 }),
      );
      expect(post).toEqual(
        expect.objectContaining({ completed: true, cancelled: false }),
      );
      expect(post?.unitsOfWork).toHaveLength(2);
      expect(post?.unitsOfWork).toEqual([
        expect.objectContaining({
          attempt: 0,
          evicted: true,
          state: UnitOfWorkState.SUCCEEDED,
          url: 'https://example.com/legacy-post',
        }),
        expect.objectContaining({
          attempt: 1,
          evicted: false,
          state: UnitOfWorkState.FAILED,
          response: expect.objectContaining({
            message: 'Legacy failure',
            stage: 'post',
          }),
        }),
      ]);

      const eventRead = jest.spyOn(
        PostEventSchema.metadata,
        'mapFromDriverValue',
      );
      const recordRead = jest.spyOn(
        PostRecordSchema.state,
        'mapFromDriverValue',
      );
      const accountRead = jest.spyOn(AccountSchema.id, 'mapFromDriverValue');
      const secondRun = await migration.migrate();
      expect(secondRun).toEqual(
        expect.objectContaining({
          submissionsScanned: 1,
          submissionsSkipped: 1,
          postsCreated: 0,
          unitsCreated: 0,
        }),
      );
      expect(eventRead).not.toHaveBeenCalled();
      expect(recordRead).not.toHaveBeenCalled();
      expect(accountRead).not.toHaveBeenCalled();
      expect(
        (await new PostRepository().findByIdOrThrow(post?.id ?? ''))
          .unitsOfWork,
      ).toHaveLength(2);
    },
  );

  it('loads only pending history and referenced account/file IDs', async () => {
    const db = getDatabase();
    await seedSubmission('pending');
    await seedSubmission('converted');
    await seedAccount('referenced-account');
    await seedAccount('unrelated-account');
    await seedRecord('pending-record', 'pending');
    await seedRecord('converted-record', 'converted');
    await seedRecord('orphan-record', null);
    await db
      .insert(PostSchema)
      .values({ submissionId: 'converted', completed: true });
    await db.insert(SubmissionFileSchema).values(
      ['pending', 'converted'].map((submissionId) => ({
        id: `${submissionId}-file`,
        submissionId,
        fileName: 'legacy.jpg',
        hasThumbnail: false,
        hash: submissionId,
        height: 1,
        width: 1,
        mimeType: 'image/jpeg',
        size: 1,
      })),
    );
    await db.insert(PostEventSchema).values(
      ['pending', 'converted', 'orphan'].map((prefix) => ({
        id: `${prefix}-event`,
        postRecordId: `${prefix}-record`,
        accountId:
          prefix === 'pending' ? 'referenced-account' : 'unrelated-account',
        fileId: prefix === 'pending' ? 'pending-file' : 'converted-file',
        eventType: PostEventType.FILE_POSTED,
        metadata: { responseMessage: prefix },
      })),
    );

    const eventRead = jest.spyOn(
      PostEventSchema.metadata,
      'mapFromDriverValue',
    );
    const recordRead = jest.spyOn(PostRecordSchema.state, 'mapFromDriverValue');
    const accountRead = jest.spyOn(AccountSchema.id, 'mapFromDriverValue');
    const fileRead = jest.spyOn(SubmissionFileSchema.id, 'mapFromDriverValue');

    const stats = await new LegacyPostHistoryMigrationService().migrate();

    expect(stats).toEqual({
      submissionsScanned: 2,
      submissionsSkipped: 1,
      postsCreated: 1,
      unitsCreated: 1,
      submissionsFailed: 0,
      recordsSkipped: 1,
      eventsSkipped: 0,
    });
    expect(eventRead).toHaveBeenCalledTimes(1);
    expect(recordRead).toHaveBeenCalledTimes(1);
    expect(accountRead).toHaveBeenCalledTimes(1);
    expect(fileRead).toHaveBeenCalledTimes(1);
    const post = await new PostRepository().findOne({
      where: (table, { eq }) => eq(table.submissionId, 'pending'),
    });
    expect(post?.unitsOfWork).toEqual([
      expect.objectContaining({
        accountId: 'referenced-account',
        fileId: 'pending-file',
      }),
    ]);
  });

  it('retries failed submissions without reloading successful conversions', async () => {
    const db = getDatabase();
    await seedAccount('legacy-account');
    for (const id of ['a-failed', 'b-successful']) {
      await seedSubmission(id);
      await seedRecord(`${id}-record`, id);
      await db.insert(PostEventSchema).values({
        postRecordId: `${id}-record`,
        accountId: 'legacy-account',
        eventType: PostEventType.MESSAGE_POSTED,
        metadata: { responseMessage: id },
      });
    }
    jest.spyOn(db, 'transaction').mockImplementationOnce(() => {
      throw new Error('Simulated migration failure');
    });
    const migration = new LegacyPostHistoryMigrationService();

    expect(await migration.migrate()).toEqual(
      expect.objectContaining({ postsCreated: 1, submissionsFailed: 1 }),
    );
    const eventRead = jest.spyOn(
      PostEventSchema.metadata,
      'mapFromDriverValue',
    );
    expect(await migration.migrate()).toEqual(
      expect.objectContaining({
        postsCreated: 1,
        submissionsSkipped: 1,
        submissionsFailed: 0,
      }),
    );
    expect(eventRead).toHaveBeenCalledTimes(1);
  });

  it('keeps empty conversions retryable without blocking other submissions', async () => {
    const db = getDatabase();
    await seedAccount('legacy-account');
    for (const id of ['a-empty', 'b-eligible']) {
      await seedSubmission(id);
      await seedRecord(`${id}-record`, id);
      await db.insert(PostEventSchema).values({
        postRecordId: `${id}-record`,
        accountId: id === 'a-empty' ? null : 'legacy-account',
        eventType: PostEventType.MESSAGE_POSTED,
      });
    }
    const migration = new LegacyPostHistoryMigrationService();

    expect(await migration.migrate()).toEqual(
      expect.objectContaining({
        postsCreated: 1,
        submissionsSkipped: 1,
        eventsSkipped: 1,
      }),
    );
    expect(await migration.migrate()).toEqual(
      expect.objectContaining({
        postsCreated: 0,
        submissionsSkipped: 2,
        eventsSkipped: 1,
      }),
    );
  });

  it('preserves attempt order across record and unit insertion batches', async () => {
    const db = getDatabase();
    await seedSubmission('batched');
    await seedAccount('legacy-account');
    const recordIds = Array.from(
      { length: 260 },
      (_, index) => `record-${String(index).padStart(3, '0')}`,
    );
    await db.insert(PostRecordSchema).values(
      recordIds.map((id) => ({
        id,
        submissionId: 'batched',
        createdAt: '2026-01-01T00:00:00.000Z',
        resumeMode: PostRecordResumeMode.NEW,
        state: PostRecordState.DONE,
      })),
    );
    await db.insert(PostEventSchema).values(
      recordIds.map((postRecordId) => ({
        postRecordId,
        accountId: 'legacy-account',
        eventType: PostEventType.MESSAGE_POSTED,
      })),
    );

    expect(await new LegacyPostHistoryMigrationService().migrate()).toEqual(
      expect.objectContaining({ postsCreated: 1, unitsCreated: 260 }),
    );
    const post = await new PostRepository().findOne({
      where: (table, { eq }) => eq(table.submissionId, 'batched'),
    });
    expect(
      post?.unitsOfWork.map((unit) => unit.attempt).sort((a, b) => a - b),
    ).toEqual(Array.from({ length: 260 }, (_, index) => index));
    expect(post?.unitsOfWork.filter((unit) => !unit.evicted)).toEqual([
      expect.objectContaining({ attempt: 259 }),
    ]);
  });
});
