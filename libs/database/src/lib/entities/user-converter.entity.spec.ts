import { HydrationContext } from '../repositories/base/hydration-context';
import { assertRowRoundtrips } from '../repositories/base/test-utils';
import { UserConverter, type UserConverterRow } from './user-converter.entity';

function buildRow(overrides: Partial<UserConverterRow> = {}): UserConverterRow {
  return {
    id: 'uc-1',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    username: 'alice',
    convertTo: { default: 'alice' },
    ...overrides,
  };
}

describe('UserConverter.fromRow', () => {
  it('round-trips every scalar column', () => {
    const row = buildRow();
    const entity = UserConverter.fromRow(row);
    expect(entity).toBeInstanceOf(UserConverter);
    assertRowRoundtrips(row, entity as unknown as Record<string, unknown> & { id: string });
  });

  it('dedupes by id within a shared context', () => {
    const ctx = new HydrationContext();
    const row = buildRow();
    expect(UserConverter.fromRow(row, ctx)).toBe(UserConverter.fromRow(row, ctx));
  });
});
