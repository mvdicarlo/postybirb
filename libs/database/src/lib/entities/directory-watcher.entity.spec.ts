import {
  DirectoryWatcherImportAction,
  SubmissionType,
  ScheduleType,
} from '@postybirb/types';
import type { ISubmissionMetadata } from '@postybirb/types';
import {
  DirectoryWatcher,
  type DirectoryWatcherRow,
} from './directory-watcher.entity';
import { Submission, type SubmissionRow } from './submission.entity';
import { HydrationContext } from '../repositories/base/hydration-context';
import { assertRowRoundtrips } from '../repositories/base/test-utils';

function buildRow(
  overrides: Partial<DirectoryWatcherRow> = {},
): DirectoryWatcherRow {
  return {
    id: 'dw-1',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    path: '/tmp/dw',
    templateId: 'sub-1',
    importAction: DirectoryWatcherImportAction.NEW_SUBMISSION,
    ...overrides,
  } as DirectoryWatcherRow;
}

function makeSubmissionRow(id = 'sub-1'): SubmissionRow {
  return {
    id,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    type: SubmissionType.FILE,
    isScheduled: false,
    isTemplate: true,
    isMultiSubmission: false,
    isArchived: false,
    isInitialized: false,
    schedule: { scheduleType: ScheduleType.NONE },
    metadata: {} as ISubmissionMetadata,
    order: 0,
  };
}

describe('DirectoryWatcher.fromRow', () => {
  it('round-trips scalar columns', () => {
    const row = buildRow();
    const entity = DirectoryWatcher.fromRow(row);
    expect(entity).toBeInstanceOf(DirectoryWatcher);
    assertRowRoundtrips(
      row,
      entity as unknown as Record<string, unknown> & { id: string },
      ['template'],
    );
  });

  it('hydrates template relation when present', () => {
    const row = buildRow({ template: makeSubmissionRow() });
    const entity = DirectoryWatcher.fromRow(row);
    expect(entity.template).toBeInstanceOf(Submission);
  });

  it('toDTO projects template down to its id', () => {
    const row = buildRow({ template: makeSubmissionRow('sub-9') });
    const dto = DirectoryWatcher.fromRow(row).toDTO();
    expect(dto.template).toBe('sub-9');
  });

  it('dedupes by id within a shared context', () => {
    const ctx = new HydrationContext();
    const row = buildRow();
    expect(DirectoryWatcher.fromRow(row, ctx)).toBe(
      DirectoryWatcher.fromRow(row, ctx),
    );
  });
});
