import { UnitOfWorkState } from '@postybirb/types';
import { assertRowRoundtrips } from '../repositories/base/test-utils';
import { Post, type PostRow } from './post.entity';
import type { UnitOfWorkRow } from './unit-of-work.entity';

function buildRow(overrides: Partial<PostRow> = {}): PostRow {
  return {
    id: 'post-1',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    submissionId: 'sub-1',
    completed: false,
    cancelled: false,
    ...overrides,
  };
}

function buildUnitOfWorkRow(): UnitOfWorkRow {
  return {
    id: 'unit-1',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    postId: 'post-1',
    submissionId: 'sub-1',
    accountId: 'account-1',
    fileId: null,
    fileHash: null,
    attempt: 0,
    data: null,
    response: null,
    evicted: false,
    url: null,
    batch: null,
    state: UnitOfWorkState.NEW,
  };
}

describe('Post.fromRow', () => {
  it('round-trips scalar columns', () => {
    const row = buildRow();
    const entity = Post.fromRow(row);

    assertRowRoundtrips(
      row,
      entity as unknown as Record<string, unknown> & { id: string },
      ['unitsOfWork'],
    );
    expect(entity.unitsOfWork).toEqual([]);
  });

  it('maps related units of work to their ids', () => {
    const entity = Post.fromRow(
      buildRow({ unitsOfWork: [buildUnitOfWorkRow()] }),
    );

    expect(entity.unitsOfWork).toEqual(['unit-1']);
  });
});