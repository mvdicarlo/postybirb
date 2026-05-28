import { DefaultDescription } from '@postybirb/types';
import { CustomShortcut, type CustomShortcutRow } from './custom-shortcut.entity';
import { HydrationContext } from '../repositories/base/hydration-context';
import { assertRowRoundtrips } from '../repositories/base/test-utils';

function buildRow(overrides: Partial<CustomShortcutRow> = {}): CustomShortcutRow {
  return {
    id: 'cs-1',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    name: 'demo',
    shortcut: DefaultDescription(),
    ...overrides,
  };
}

describe('CustomShortcut.fromRow', () => {
  it('round-trips every scalar column', () => {
    const row = buildRow();
    const entity = CustomShortcut.fromRow(row);
    expect(entity).toBeInstanceOf(CustomShortcut);
    assertRowRoundtrips(row, entity as unknown as Record<string, unknown> & { id: string });
  });

  it('dedupes by id within a shared HydrationContext', () => {
    const ctx = new HydrationContext();
    const row = buildRow();
    const a = CustomShortcut.fromRow(row, ctx);
    const b = CustomShortcut.fromRow(row, ctx);
    expect(a).toBe(b);
  });

  it('produces independent instances across contexts', () => {
    const row = buildRow();
    const a = CustomShortcut.fromRow(row);
    const b = CustomShortcut.fromRow(row);
    expect(a).not.toBe(b);
  });

  it('fromRows maps each row through fromRow under one context', () => {
    const rows = [buildRow({ id: 'a' }), buildRow({ id: 'b' }), buildRow({ id: 'a' })];
    const ctx = new HydrationContext();
    const entities = CustomShortcut.fromRows(rows, ctx);
    expect(entities).toHaveLength(3);
    expect(entities[0]).toBe(entities[2]);
    expect(entities[0]).not.toBe(entities[1]);
  });
});
