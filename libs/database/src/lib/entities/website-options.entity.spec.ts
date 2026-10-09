import type {
    ISubmissionMetadata,
    IWebsiteFormFields,
} from '@postybirb/types';
import { ScheduleType, SubmissionType } from '@postybirb/types';
import { HydrationContext } from '../repositories/base/hydration-context';
import { assertRowRoundtrips } from '../repositories/base/test-utils';
import { Account } from './account.entity';
import { Submission, type SubmissionRow } from './submission.entity';
import {
    WebsiteOptions,
    type WebsiteOptionsRow,
} from './website-options.entity';

function buildRow(
  overrides: Partial<WebsiteOptionsRow> = {},
): WebsiteOptionsRow {
  return {
    id: 'wo-1',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    accountId: 'a-1',
    submissionId: 'sub-1',
    data: { title: 't' } as IWebsiteFormFields,
    isDefault: true,
    ...overrides,
  };
}

function makeSubmissionRow(id = 'sub-1'): SubmissionRow {
  return {
    id,
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
}

describe('WebsiteOptions.fromRow', () => {
  it('round-trips scalar columns', () => {
    const row = buildRow();
    const entity = WebsiteOptions.fromRow(row);
    expect(entity).toBeInstanceOf(WebsiteOptions);
    assertRowRoundtrips(
      row,
      entity as unknown as Record<string, unknown> & { id: string },
      ['account', 'submission'],
    );
  });

  it('hydrates account and submission relations when present', () => {
    const row = buildRow({
      account: {
        id: 'a-1',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
        name: 'acct',
        website: 'demo',
        groups: [],
      },
      submission: makeSubmissionRow(),
    });
    const entity = WebsiteOptions.fromRow(row);
    expect(entity.account).toBeInstanceOf(Account);
    expect(entity.submission).toBeInstanceOf(Submission);
  });

  it('shares identity for repeated submission via shared ctx', () => {
    const ctx = new HydrationContext();
    const sub = makeSubmissionRow();
    const a = WebsiteOptions.fromRow(buildRow({ id: 'x', submission: sub }), ctx);
    const b = WebsiteOptions.fromRow(buildRow({ id: 'y', submission: sub }), ctx);
    expect(a.submission).toBe(b.submission);
  });
});
