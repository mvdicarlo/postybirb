import { partitionUnitsOfWorkByRateLimit } from './unit-of-work-rate-limit';

interface TestUnit {
  id: string;
  accountId: string;
  batch?: string;
  rateLimitedUntil?: string;
}

function unit(id: string, overrides: Partial<TestUnit> = {}): TestUnit {
  return {
    id,
    accountId: 'account-1',
    batch: 'batch-1',
    ...overrides,
  };
}

describe('partitionUnitsOfWorkByRateLimit', () => {
  const now = Date.parse('2026-08-04T12:00:00.000Z');

  it('defers every member of a batch when one member has a future timestamp', () => {
    const future = '2026-08-04T12:01:00.000Z';
    const result = partitionUnitsOfWorkByRateLimit(
      [
        unit('deferred-1', { rateLimitedUntil: future }),
        unit('deferred-2'),
        unit('ready', { batch: 'batch-2' }),
      ],
      now,
    );

    expect(result.ready.map(({ id }) => id)).toEqual(['ready']);
    expect(result.deferred.map(({ id }) => id)).toEqual([
      'deferred-1',
      'deferred-2',
    ]);
  });

  it('keeps matching batch IDs isolated by account', () => {
    const result = partitionUnitsOfWorkByRateLimit(
      [
        unit('deferred', {
          rateLimitedUntil: '2026-08-04T12:01:00.000Z',
        }),
        unit('ready', { accountId: 'account-2' }),
      ],
      now,
    );

    expect(result.ready.map(({ id }) => id)).toEqual(['ready']);
    expect(result.deferred.map(({ id }) => id)).toEqual(['deferred']);
  });

  it('groups units without batch IDs by account', () => {
    const result = partitionUnitsOfWorkByRateLimit(
      [
        unit('deferred-1', {
          batch: undefined,
          rateLimitedUntil: '2026-08-04T12:01:00.000Z',
        }),
        unit('deferred-2', { batch: undefined }),
      ],
      now,
    );

    expect(result.ready).toHaveLength(0);
    expect(result.deferred).toHaveLength(2);
  });

  it.each([
    undefined,
    'not-a-date',
    '2026-08-04T11:59:59.999Z',
    '2026-08-04T12:00:00.000Z',
  ])('treats %s as ready', (rateLimitedUntil) => {
    const result = partitionUnitsOfWorkByRateLimit(
      [unit('ready', { rateLimitedUntil })],
      now,
    );

    expect(result.ready).toHaveLength(1);
    expect(result.deferred).toHaveLength(0);
  });
});