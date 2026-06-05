import { HydrationContext } from '../repositories/base/hydration-context';
import { assertRowRoundtrips } from '../repositories/base/test-utils';
import { Settings, type SettingsRow } from './settings.entity';

function buildRow(overrides: Partial<SettingsRow> = {}): SettingsRow {
  return {
    id: 's-1',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    profile: 'default',
    settings: {} as SettingsRow['settings'],
    ...overrides,
  };
}

describe('Settings.fromRow', () => {
  it('round-trips every scalar column', () => {
    const row = buildRow();
    const entity = Settings.fromRow(row);
    expect(entity).toBeInstanceOf(Settings);
    assertRowRoundtrips(row, entity as unknown as Record<string, unknown> & { id: string });
  });

  it('dedupes by id within a shared context', () => {
    const ctx = new HydrationContext();
    const row = buildRow();
    expect(Settings.fromRow(row, ctx)).toBe(Settings.fromRow(row, ctx));
  });
});
