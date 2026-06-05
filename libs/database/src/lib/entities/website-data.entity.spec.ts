import { HydrationContext } from '../repositories/base/hydration-context';
import { assertRowRoundtrips } from '../repositories/base/test-utils';
import { WebsiteData, type WebsiteDataRow } from './website-data.entity';

function buildRow(overrides: Partial<WebsiteDataRow> = {}): WebsiteDataRow {
  return {
    id: 'wd-1',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    data: { token: 'abc' },
    ...overrides,
  };
}

describe('WebsiteData.fromRow', () => {
  it('round-trips every scalar column', () => {
    const row = buildRow();
    const entity = WebsiteData.fromRow(row);
    expect(entity).toBeInstanceOf(WebsiteData);
    assertRowRoundtrips(row, entity as unknown as Record<string, unknown> & { id: string });
  });

  it('dedupes by id within a shared context', () => {
    const ctx = new HydrationContext();
    const row = buildRow();
    expect(WebsiteData.fromRow(row, ctx)).toBe(WebsiteData.fromRow(row, ctx));
  });
});
