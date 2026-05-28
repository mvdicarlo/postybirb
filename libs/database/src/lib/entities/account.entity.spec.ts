import { Account, type AccountRow } from './account.entity';
import { WebsiteData } from './website-data.entity';
import { HydrationContext } from '../repositories/base/hydration-context';
import { assertRowRoundtrips } from '../repositories/base/test-utils';

function buildRow(overrides: Partial<AccountRow> = {}): AccountRow {
  return {
    id: 'a-1',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    name: 'acct',
    website: 'demo',
    groups: ['g1'],
    ...overrides,
  };
}

describe('Account.fromRow', () => {
  it('round-trips scalar columns (excluding relation)', () => {
    const row = buildRow();
    const entity = Account.fromRow(row);
    expect(entity).toBeInstanceOf(Account);
    assertRowRoundtrips(
      row,
      entity as unknown as Record<string, unknown> & { id: string },
      ['websiteData'],
    );
  });

  it('hydrates websiteData relation when present', () => {
    const row = buildRow({
      websiteData: {
        id: 'wd-1',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
        data: { token: 'abc' },
      },
    });
    const entity = Account.fromRow(row);
    expect(entity.websiteData).toBeInstanceOf(WebsiteData);
    expect(entity.websiteData.data).toEqual({ token: 'abc' });
  });

  it('leaves websiteData unset when absent', () => {
    const entity = Account.fromRow(buildRow());
    expect(entity.websiteData).toBeUndefined();
  });

  it('dedupes by id within a shared context', () => {
    const ctx = new HydrationContext();
    const row = buildRow();
    expect(Account.fromRow(row, ctx)).toBe(Account.fromRow(row, ctx));
  });
});
