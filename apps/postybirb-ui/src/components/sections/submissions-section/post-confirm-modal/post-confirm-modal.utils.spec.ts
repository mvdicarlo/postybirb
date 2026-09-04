import type { IUnitOfWork, SubmissionId } from '@postybirb/types';
import { buildBulkPostingRequests } from './post-confirm-modal.utils';

function unit(
  id: string,
  submissionId: string,
  accountId: string,
  fileId: string,
): IUnitOfWork {
  return { id, submissionId, accountId, fileId } as IUnitOfWork;
}

describe('post confirm modal utilities', () => {
  it('preserves submission order and partitions evictions by submission', () => {
    const first = unit('unit-1', 'submission-1', 'shared-account', 'file-1');
    const second = unit('unit-2', 'submission-2', 'shared-account', 'file-2');
    const completedUnits = new Map<SubmissionId, IUnitOfWork[]>([
      ['submission-1', [first]],
      ['submission-2', [second]],
    ]);

    expect(
      buildBulkPostingRequests(
        ['submission-2', 'submission-1'],
        completedUnits,
        new Set(['unit-1', 'unit-2']),
      ),
    ).toEqual([
      {
        submissionId: 'submission-2',
        evictions: { 'shared-account': ['file-2'] },
      },
      {
        submissionId: 'submission-1',
        evictions: { 'shared-account': ['file-1'] },
      },
    ]);
  });

  it('returns an empty eviction map when no completed work is selected', () => {
    expect(
      buildBulkPostingRequests(
        ['submission-1'],
        new Map([['submission-1', []]]),
        new Set(),
      ),
    ).toEqual([{ submissionId: 'submission-1', evictions: {} }]);
  });
});