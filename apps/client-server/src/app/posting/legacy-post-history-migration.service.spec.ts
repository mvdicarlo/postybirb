import {
    AccountSchema,
    clearDatabase,
    getDatabase,
    PostEventSchema,
    PostRecordSchema,
    PostRepository,
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
  afterEach(() => clearDatabase());

  it('collapses legacy attempts into ordered, idempotent unit history', async () => {
    const db = getDatabase();
    const submissionId = 'legacy-submission';
    const accountId = 'legacy-account';
    const originId = 'legacy-origin';
    const retryId = 'legacy-retry';

    await db.insert(SubmissionSchema).values({
      id: submissionId,
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
    await db.insert(AccountSchema).values({
      id: accountId,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      groups: [],
      name: 'Legacy account',
      website: 'test',
    });
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
        state: PostRecordState.FAILED,
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
    expect(post).toEqual(expect.objectContaining({ completed: true }));
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

    const secondRun = await migration.migrate();
    expect(secondRun).toEqual(
      expect.objectContaining({ postsCreated: 0, unitsCreated: 0 }),
    );
    expect((await new PostRepository().findByIdOrThrow(post?.id ?? '')).unitsOfWork)
      .toHaveLength(2);
  });
});