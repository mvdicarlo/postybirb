import { UnitOfWorkState } from '@postybirb/types';
import { assertRowRoundtrips } from '../repositories/base/test-utils';
import {
    UnitOfWork,
    type UnitOfWorkRow,
} from './unit-of-work.entity';

function buildRow(overrides: Partial<UnitOfWorkRow> = {}): UnitOfWorkRow {
  return {
    id: 'unit-1',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    postId: 'post-1',
    submissionId: 'sub-1',
    accountId: 'account-1',
    fileId: 'file-1',
    fileHash: 'hash-1',
    attempt: 2,
    data: { request: true },
    response: { status: 201 },
    evicted: true,
    url: 'https://example.com/post/1',
    batch: 'batch-1',
    rateLimitedUntil: '2025-01-01T00:05:00.000Z',
    state: UnitOfWorkState.SUCCEEDED,
    ...overrides,
  };
}

describe('UnitOfWork.fromRow', () => {
  it('round-trips scalar columns', () => {
    const row = buildRow();
    const entity = UnitOfWork.fromRow(row);

    assertRowRoundtrips(
      row,
      entity as unknown as Record<string, unknown> & { id: string },
    );
  });

  it('normalizes nullable columns to undefined', () => {
    const entity = UnitOfWork.fromRow(
      buildRow({
        fileId: null,
        fileHash: null,
        data: null,
        response: null,
        url: null,
        batch: null,
        rateLimitedUntil: null,
      }),
    );

    expect(entity.fileId).toBeUndefined();
    expect(entity.fileHash).toBeUndefined();
    expect(entity.data).toBeUndefined();
    expect(entity.response).toBeUndefined();
    expect(entity.url).toBeUndefined();
    expect(entity.batch).toBeUndefined();
    expect(entity.rateLimitedUntil).toBeUndefined();
  });
});