import { IUnitOfWork, UnitOfWorkState } from '@postybirb/types';
import type { SubmissionRecord } from '../../../../stores/records';
import {
    getAccountPostStatusMap,
    getAccountUnitCounts,
    getUnitErrorMessages,
    getUnitErrorStack,
    getUnitFileName,
    getUnitStateInfo,
} from './history-utils';

function unit(overrides: Partial<IUnitOfWork> = {}): IUnitOfWork {
  return {
    id: 'unit-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    postId: 'post-1',
    submissionId: 'submission-1',
    accountId: 'account-1',
    attempt: 0,
    evicted: false,
    state: UnitOfWorkState.PENDING,
    ...overrides,
  };
}

/** Builds the minimal SubmissionRecord surface the utils read. */
function submissionWith(
  units: IUnitOfWork[],
  options: { accountId: string; isDefault: boolean }[] = [],
  files: { id: string; fileName: string }[] = [],
): SubmissionRecord {
  const byAccount = new Map<string, IUnitOfWork[]>();
  for (const u of units) {
    byAccount.set(u.accountId, [...(byAccount.get(u.accountId) ?? []), u]);
  }

  return {
    unitsOfWork: units,
    activeUnitsOfWork: units.filter((u) => !u.evicted),
    unitsOfWorkByAccount: byAccount,
    options,
    files,
  } as unknown as SubmissionRecord;
}

describe('getUnitStateInfo', () => {
  it('maps terminal states to distinct colors', () => {
    expect(getUnitStateInfo(UnitOfWorkState.SUCCEEDED).color).toBe('green');
    expect(getUnitStateInfo(UnitOfWorkState.FAILED).color).toBe('red');
    expect(getUnitStateInfo(UnitOfWorkState.RATE_LIMITED).color).toBe('yellow');
  });

  it('falls back to the waiting treatment for pending states', () => {
    expect(getUnitStateInfo(UnitOfWorkState.NEW).label).toBe('Waiting');
    expect(getUnitStateInfo(UnitOfWorkState.PENDING).label).toBe('Waiting');
  });
});

describe('getUnitErrorMessages', () => {
  it('returns nothing when there is no response', () => {
    expect(getUnitErrorMessages(unit())).toEqual([]);
  });

  it('reads the exception message', () => {
    const result = getUnitErrorMessages(
      unit({ response: { exception: { name: 'Err', message: 'boom' } } }),
    );
    expect(result).toEqual(['boom']);
  });

  it('falls back to the exception name and dedupes plain fields', () => {
    const result = getUnitErrorMessages(
      unit({
        response: { exception: { name: 'Err' }, error: 'bad', message: 'bad' },
      }),
    );
    expect(result).toEqual(['Err', 'bad']);
  });

  it('ignores blank values', () => {
    expect(getUnitErrorMessages(unit({ response: { error: '   ' } }))).toEqual(
      [],
    );
  });
});

describe('getUnitErrorStack', () => {
  it('surfaces the stack so failure logs stay complete', () => {
    const stack = 'Error: boom\n  at post()';
    expect(
      getUnitErrorStack(unit({ response: { exception: { stack } } })),
    ).toBe(stack);
  });

  it('returns undefined without an exception', () => {
    expect(getUnitErrorStack(unit({ response: { error: 'bad' } }))).toBeUndefined();
  });
});

describe('getAccountPostStatusMap', () => {
  it('prefers failed over every other state', () => {
    const submission = submissionWith([
      unit({ id: 'a', state: UnitOfWorkState.SUCCEEDED }),
      unit({ id: 'b', state: UnitOfWorkState.EXECUTING }),
      unit({ id: 'c', state: UnitOfWorkState.FAILED }),
    ]);
    expect(getAccountPostStatusMap(submission).get('account-1')?.status).toBe(
      'failed',
    );
  });

  it('reports running before rate limited', () => {
    const submission = submissionWith([
      unit({ id: 'a', state: UnitOfWorkState.RATE_LIMITED }),
      unit({ id: 'b', state: UnitOfWorkState.VALIDATING }),
    ]);
    expect(getAccountPostStatusMap(submission).get('account-1')?.status).toBe(
      'running',
    );
  });

  it('exposes the earliest rate limit wait', () => {
    const submission = submissionWith([
      unit({
        id: 'a',
        state: UnitOfWorkState.RATE_LIMITED,
        rateLimitedUntil: '2026-01-02T00:00:00.000Z',
      }),
      unit({
        id: 'b',
        state: UnitOfWorkState.RATE_LIMITED,
        rateLimitedUntil: '2026-01-01T12:00:00.000Z',
      }),
    ]);
    expect(getAccountPostStatusMap(submission).get('account-1')?.waitUntil).toBe(
      '2026-01-01T12:00:00.000Z',
    );
  });

  it('reports success only when all units settled successfully', () => {
    const submission = submissionWith([
      unit({ id: 'a', state: UnitOfWorkState.SUCCEEDED }),
      unit({ id: 'b', state: UnitOfWorkState.SUCCEEDED }),
    ]);
    expect(getAccountPostStatusMap(submission).get('account-1')?.status).toBe(
      'success',
    );
  });

  it('reports cancelled when nothing else ran', () => {
    const submission = submissionWith([
      unit({ id: 'a', state: UnitOfWorkState.CANCELLED }),
    ]);
    expect(getAccountPostStatusMap(submission).get('account-1')?.status).toBe(
      'cancelled',
    );
  });

  it('ignores evicted units when classifying', () => {
    const submission = submissionWith([
      unit({ id: 'a', state: UnitOfWorkState.FAILED, evicted: true }),
      unit({ id: 'b', state: UnitOfWorkState.SUCCEEDED }),
    ]);
    expect(getAccountPostStatusMap(submission).get('account-1')?.status).toBe(
      'success',
    );
  });

  it('marks configured accounts with no units as waiting', () => {
    const submission = submissionWith(
      [],
      [
        { accountId: 'account-2', isDefault: false },
        { accountId: 'default-account', isDefault: true },
      ],
    );
    const result = getAccountPostStatusMap(submission);
    expect(result.get('account-2')?.status).toBe('waiting');
    expect(result.has('default-account')).toBe(false);
  });
});

describe('getAccountUnitCounts', () => {
  it('counts evicted units separately from active states', () => {
    expect(
      getAccountUnitCounts([
        unit({ id: 'a', state: UnitOfWorkState.SUCCEEDED }),
        unit({ id: 'b', state: UnitOfWorkState.FAILED }),
        unit({ id: 'c', state: UnitOfWorkState.EXECUTING }),
        unit({ id: 'd', state: UnitOfWorkState.PENDING }),
        unit({ id: 'e', state: UnitOfWorkState.SUCCEEDED, evicted: true }),
      ]),
    ).toEqual({
      succeeded: 1,
      failed: 1,
      running: 1,
      pending: 1,
      evicted: 1,
    });
  });
});

describe('getUnitFileName', () => {
  it('resolves the file name for file units', () => {
    const submission = submissionWith([], [], [
      { id: 'file-1', fileName: 'art.png' },
    ]);
    expect(getUnitFileName(submission, unit({ fileId: 'file-1' }))).toBe(
      'art.png',
    );
  });

  it('returns undefined for message units', () => {
    expect(getUnitFileName(submissionWith([]), unit())).toBeUndefined();
  });
});
