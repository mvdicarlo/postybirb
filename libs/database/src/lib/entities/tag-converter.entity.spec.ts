import { HydrationContext } from '../repositories/base/hydration-context';
import { assertRowRoundtrips } from '../repositories/base/test-utils';
import { TagConverter, type TagConverterRow } from './tag-converter.entity';

function buildRow(overrides: Partial<TagConverterRow> = {}): TagConverterRow {
  return {
    id: 'tc-1',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    tag: 'foo',
    convertTo: { default: 'foo' },
    ...overrides,
  };
}

describe('TagConverter.fromRow', () => {
  it('round-trips every scalar column', () => {
    const row = buildRow();
    const entity = TagConverter.fromRow(row);
    expect(entity).toBeInstanceOf(TagConverter);
    assertRowRoundtrips(row, entity as unknown as Record<string, unknown> & { id: string });
  });

  it('dedupes by id within a shared context', () => {
    const ctx = new HydrationContext();
    const row = buildRow();
    expect(TagConverter.fromRow(row, ctx)).toBe(TagConverter.fromRow(row, ctx));
  });
});
