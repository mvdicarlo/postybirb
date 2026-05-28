import { TagGroup, type TagGroupRow } from './tag-group.entity';
import { HydrationContext } from '../repositories/base/hydration-context';
import { assertRowRoundtrips } from '../repositories/base/test-utils';

function buildRow(overrides: Partial<TagGroupRow> = {}): TagGroupRow {
  return {
    id: 'tg-1',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    name: 'group',
    tags: ['a', 'b'],
    ...overrides,
  };
}

describe('TagGroup.fromRow', () => {
  it('round-trips every scalar column', () => {
    const row = buildRow();
    const entity = TagGroup.fromRow(row);
    expect(entity).toBeInstanceOf(TagGroup);
    assertRowRoundtrips(row, entity as unknown as Record<string, unknown> & { id: string });
  });

  it('dedupes by id within a shared context', () => {
    const ctx = new HydrationContext();
    const row = buildRow();
    expect(TagGroup.fromRow(row, ctx)).toBe(TagGroup.fromRow(row, ctx));
  });

  it('fromRows preserves identity for repeated ids', () => {
    const ctx = new HydrationContext();
    const entities = TagGroup.fromRows(
      [buildRow({ id: 'x' }), buildRow({ id: 'x' })],
      ctx,
    );
    expect(entities[0]).toBe(entities[1]);
  });
});
