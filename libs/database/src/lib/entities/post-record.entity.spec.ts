import {
  PostEventType,
  PostRecordResumeMode,
  PostRecordState,
  ScheduleType,
  SubmissionType,
} from '@postybirb/types';
import type { ISubmissionMetadata } from '@postybirb/types';
import { PostRecord, type PostRecordRow } from './post-record.entity';
import { PostEvent } from './post-event.entity';
import { Submission } from './submission.entity';
import { HydrationContext } from '../repositories/base/hydration-context';
import { assertRowRoundtrips } from '../repositories/base/test-utils';

function buildRow(overrides: Partial<PostRecordRow> = {}): PostRecordRow {
  return {
    id: 'pr-1',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    postQueueRecordId: 'pq-1',
    submissionId: 'sub-1',
    state: PostRecordState.PENDING,
    resumeMode: PostRecordResumeMode.NEW,
    ...overrides,
  } as PostRecordRow;
}

describe('PostRecord.fromRow', () => {
  it('round-trips scalar columns', () => {
    const row = buildRow();
    const entity = PostRecord.fromRow(row);
    expect(entity).toBeInstanceOf(PostRecord);
    assertRowRoundtrips(
      row,
      entity as unknown as Record<string, unknown> & { id: string },
      ['submission', 'origin', 'chainedRecords', 'events', 'postQueueRecord'],
    );
  });

  it('hydrates submission, events, and chainedRecords', () => {
    const row = buildRow({
      submission: {
        id: 'sub-1',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
        type: SubmissionType.FILE,
        isScheduled: false,
        isTemplate: false,
        isMultiSubmission: false,
        isArchived: false,
        isInitialized: false,
        schedule: { scheduleType: ScheduleType.NONE },
        metadata: {} as ISubmissionMetadata,
        order: 0,
      },
      events: [
        {
          id: 'pe-1',
          createdAt: '2025-01-01T00:00:00.000Z',
          postRecordId: 'pr-1',
          eventType: PostEventType.POST_ATTEMPT_STARTED,
        } as any,
      ],
      chainedRecords: [buildRow({ id: 'pr-2' })],
    });
    const entity = PostRecord.fromRow(row);
    expect(entity.submission).toBeInstanceOf(Submission);
    expect(entity.events?.[0]).toBeInstanceOf(PostEvent);
    expect(entity.chainedRecords?.[0]).toBeInstanceOf(PostRecord);
  });

  it('shares submission identity across two records via shared ctx', () => {
    const ctx = new HydrationContext();
    const sub = {
      id: 'sub-shared',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
      type: SubmissionType.FILE,
      isScheduled: false,
      isTemplate: false,
      isMultiSubmission: false,
      isArchived: false,
      isInitialized: false,
      schedule: { scheduleType: ScheduleType.NONE },
      metadata: {} as ISubmissionMetadata,
      order: 0,
    };
    const a = PostRecord.fromRow(buildRow({ id: 'a', submission: sub }), ctx);
    const b = PostRecord.fromRow(buildRow({ id: 'b', submission: sub }), ctx);
    expect(a.submission).toBe(b.submission);
  });
});
