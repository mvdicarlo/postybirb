import type { IUnitOfWork, SubmissionId } from '@postybirb/types';
import { buildBulkPostingRequests } from './post-confirm-modal.utils';

it('omits unselected submissions and sends only selected targets in batch order', () => {
  const units = new Map([
    ['first', [{ id: 'file-unit', accountId: 'account-1', fileId: 'file-1' } as IUnitOfWork]],
    ['second', [{ id: 'message-unit', accountId: 'account-2' } as IUnitOfWork]],
    ['skipped', [{ id: 'other-unit', accountId: 'account-3' } as IUnitOfWork]],
  ]);
  expect(buildBulkPostingRequests(['second', 'skipped', 'first'], units, new Set(['file-unit', 'message-unit']), true)).toEqual([
    { submissionId: 'second', evictions: {}, targets: { 'account-2': [] } },
    { submissionId: 'first', evictions: {}, targets: { 'account-1': ['file-1'] } },
  ]);
  expect(buildBulkPostingRequests(['first'], units, new Set(), true)).toEqual([]);
});

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