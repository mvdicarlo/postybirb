import type { IUnitOfWork } from '@postybirb/types';
import {
    buildSelectablePostingUnits,
    buildUnitOfWorkEvictions,
    getUnitSelectionState,
    groupUnitsByWebsite,
    updateUnitSelection,
} from './post-preview-modal.utils';

function unit(
  id: string,
  accountId: string,
  fileId?: string,
): IUnitOfWork {
  return { id, accountId, fileId } as IUnitOfWork;
}

describe('post preview utilities', () => {
  it('exposes eligible targets regardless of history and keeps selection keys stable', () => {
    const submission = {
      submissionId: 'submission', createdAt: '2026-09-08', updatedAt: '2026-09-08',
      files: [
        { id: 'file-1', hash: 'hash-1', metadata: { ignoredWebsites: [] } },
        { id: 'file-2', hash: 'hash-2', metadata: { ignoredWebsites: ['account-2'] } },
      ],
      options: [{ isDefault: true }, { accountId: 'account-1' }, { accountId: 'account-2' }],
      activeUnitsOfWork: [],
    } as unknown as Parameters<typeof buildSelectablePostingUnits>[0];
    const targets = buildSelectablePostingUnits(submission);
    expect(targets.map(({ accountId, fileId }) => [accountId, fileId])).toEqual([
      ['account-1', 'file-1'], ['account-1', 'file-2'], ['account-2', 'file-1'],
    ]);
    const refreshed = buildSelectablePostingUnits({ ...submission, activeUnitsOfWork: targets.map((target) => ({ ...target, id: 'persisted-id' })) });
    expect(refreshed.map((target) => target.id)).toEqual(targets.map((target) => target.id));
    expect(buildUnitOfWorkEvictions(targets, new Set([targets[1].id]))).toEqual({ 'account-1': ['file-2'] });
    expect(buildUnitOfWorkEvictions(targets, new Set())).toEqual({});
  });

  it('offers account-only targets for message submissions', () => {
    const targets = buildSelectablePostingUnits({
      submissionId: 'message', files: [], activeUnitsOfWork: [],
      createdAt: new Date('2026-09-08'), updatedAt: new Date('2026-09-08'),
      options: [{ accountId: 'account-1', isDefault: false }],
    } as unknown as Parameters<typeof buildSelectablePostingUnits>[0]);
    expect(buildUnitOfWorkEvictions(targets, new Set(targets.map((target) => target.id))))
      .toEqual({ 'account-1': [] });
  });

  it('builds precise per-file evictions for selected units', () => {
    const units = [
      unit('unit-1', 'account-1', 'file-1'),
      unit('unit-2', 'account-1', 'file-2'),
      unit('unit-3', 'account-2', 'file-3'),
    ];

    expect(
      buildUnitOfWorkEvictions(units, new Set(['unit-1', 'unit-2'])),
    ).toEqual({
      'account-1': ['file-1', 'file-2'],
    });
  });

  it('uses an account wildcard for selected fileless work', () => {
    const units = [
      unit('message', 'account-1'),
      unit('file', 'account-1', 'file-1'),
    ];

    expect(
      buildUnitOfWorkEvictions(units, new Set(['message', 'file'])),
    ).toEqual({
      'account-1': [],
    });
  });

  it('selects and clears all descendant units as one operation', () => {
    const units = [
      unit('unit-1', 'account-1', 'file-1'),
      unit('unit-2', 'account-1', 'file-2'),
    ];
    const selected = updateUnitSelection(new Set(), units, true);

    expect([...selected]).toEqual(['unit-1', 'unit-2']);
    expect(getUnitSelectionState(selected, units)).toEqual({
      checked: true,
      indeterminate: false,
    });
    expect(updateUnitSelection(selected, units, false).size).toBe(0);
  });

  it('groups accounts sharing a website under one website selection', () => {
    const units = [
      unit('unit-1', 'account-1', 'file-1'),
      unit('unit-2', 'account-2', 'file-1'),
    ];
    const accounts = new Map([
      [
        'account-1',
        {
          id: 'account-1',
          name: 'Primary',
          website: 'example',
          websiteDisplayName: 'Example',
        },
      ],
      [
        'account-2',
        {
          id: 'account-2',
          name: 'Secondary',
          website: 'example',
          websiteDisplayName: 'Example',
        },
      ],
    ]);

    const groups = groupUnitsByWebsite(units, accounts);

    expect(groups).toHaveLength(1);
    expect(groups[0].accounts.map((group) => group.accountId)).toEqual([
      'account-1',
      'account-2',
    ]);
  });
});