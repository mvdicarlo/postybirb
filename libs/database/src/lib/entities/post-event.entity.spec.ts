import type { ISubmissionMetadata } from '@postybirb/types';
import {
    PostEventType,
    PostRecordResumeMode,
    PostRecordState,
    ScheduleType,
    SubmissionType,
} from '@postybirb/types';
import { assertRowRoundtrips } from '../repositories/base/test-utils';
import { Account } from './account.entity';
import { PostEvent, type PostEventRow } from './post-event.entity';
import type { PostRecordRow } from './post-record.entity';
import { PostRecord } from './post-record.entity';

function makePostRecordRow(id = 'pr-1'): PostRecordRow {
  return {
    id,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    postQueueRecordId: 'pq-1',
    submissionId: 'sub-1',
    state: PostRecordState.PENDING,
    resumeMode: PostRecordResumeMode.NEW,
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
  } as PostRecordRow;
}

function buildRow(overrides: Partial<PostEventRow> = {}): PostEventRow {
  return {
    id: 'pe-1',
    createdAt: '2025-01-01T00:00:00.000Z',
    postRecordId: 'pr-1',
    eventType: PostEventType.POST_ATTEMPT_STARTED,
    ...overrides,
  } as PostEventRow;
}

describe('PostEvent.fromRow', () => {
  it('round-trips scalar columns', () => {
    const row = buildRow();
    const entity = PostEvent.fromRow(row);
    expect(entity).toBeInstanceOf(PostEvent);
    assertRowRoundtrips(
      row,
      entity as unknown as Record<string, unknown> & { id: string },
      ['postRecord', 'account'],
    );
  });

  it('hydrates relations when present', () => {
    const row = buildRow({
      postRecord: makePostRecordRow(),
      account: {
        id: 'a-1',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
        name: 'a',
        website: 'w',
        groups: [],
      },
    });
    const entity = PostEvent.fromRow(row);
    expect(entity.postRecord).toBeInstanceOf(PostRecord);
    expect(entity.account).toBeInstanceOf(Account);
  });
});
