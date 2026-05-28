import {
  ScheduleType,
  SubmissionType,
} from '@postybirb/types';
import type {
  ISubmissionMetadata,
  IWebsiteFormFields,
} from '@postybirb/types';
import { Submission, type SubmissionRow } from './submission.entity';
import { WebsiteOptions } from './website-options.entity';
import { HydrationContext } from '../repositories/base/hydration-context';
import { assertRowRoundtrips } from '../repositories/base/test-utils';

function buildRow(overrides: Partial<SubmissionRow> = {}): SubmissionRow {
  return {
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
    ...overrides,
  };
}

describe('Submission.fromRow', () => {
  it('round-trips scalar columns', () => {
    const row = buildRow();
    const entity = Submission.fromRow(row);
    expect(entity).toBeInstanceOf(Submission);
    assertRowRoundtrips(
      row,
      entity as unknown as Record<string, unknown> & { id: string },
      ['options', 'posts', 'files', 'postQueueRecord'],
    );
  });

  it('hydrates options when present', () => {
    const row = buildRow({
      options: [
        {
          id: 'wo-1',
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-01T00:00:00.000Z',
          accountId: 'a-1',
          submissionId: 'sub-1',
          data: { title: 't' } as IWebsiteFormFields,
          isDefault: true,
        },
      ],
    });
    const entity = Submission.fromRow(row);
    expect(entity.options?.[0]).toBeInstanceOf(WebsiteOptions);
  });

  it('back-reference: options[].submission resolves to parent via shared ctx', () => {
    const ctx = new HydrationContext();
    const subRow = buildRow();
    subRow.options = [
      {
        id: 'wo-1',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
        accountId: 'a-1',
        submissionId: 'sub-1',
        data: { title: 't' } as IWebsiteFormFields,
        isDefault: true,
        submission: subRow,
      },
    ];
    const entity = Submission.fromRow(subRow, ctx);
    expect(entity.options[0].submission).toBe(entity);
  });

  it('getSubmissionName falls back to "Unknown" when no default option', () => {
    const entity = Submission.fromRow(buildRow());
    expect(entity.getSubmissionName()).toBe('Unknown');
  });
});
