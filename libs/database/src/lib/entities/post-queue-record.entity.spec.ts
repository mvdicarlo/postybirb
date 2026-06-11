import type { ISubmissionMetadata } from '@postybirb/types';
import { ScheduleType, SubmissionType } from '@postybirb/types';
import { HydrationContext } from '../repositories/base/hydration-context';
import { assertRowRoundtrips } from '../repositories/base/test-utils';
import {
  PostQueueRecord,
  type PostQueueRecordRow,
} from './post-queue-record.entity';
import { Submission } from './submission.entity';

function buildRow(
  overrides: Partial<PostQueueRecordRow> = {},
): PostQueueRecordRow {
  return {
    id: 'pq-1',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    submissionId: 'sub-1',
    ...overrides,
  } as PostQueueRecordRow;
}

describe('PostQueueRecord.fromRow', () => {
  it('round-trips scalar columns', () => {
    const row = buildRow();
    const entity = PostQueueRecord.fromRow(row);
    expect(entity).toBeInstanceOf(PostQueueRecord);
    assertRowRoundtrips(
      row,
      entity as unknown as Record<string, unknown> & { id: string },
      ['submission'],
    );
  });

  it('hydrates the submission relation when present', () => {
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
    });
    const entity = PostQueueRecord.fromRow(row);
    expect(entity.submission).toBeInstanceOf(Submission);
  });

  it('dedupes by id within a shared context', () => {
    const ctx = new HydrationContext();
    const row = buildRow();
    expect(PostQueueRecord.fromRow(row, ctx)).toBe(
      PostQueueRecord.fromRow(row, ctx),
    );
  });
});
