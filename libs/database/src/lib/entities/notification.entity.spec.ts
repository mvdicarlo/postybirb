import { Notification, type NotificationRow } from './notification.entity';
import { HydrationContext } from '../repositories/base/hydration-context';
import { assertRowRoundtrips } from '../repositories/base/test-utils';

function buildRow(overrides: Partial<NotificationRow> = {}): NotificationRow {
  return {
    id: 'n-1',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    title: 'hi',
    message: 'msg',
    tags: ['t'],
    data: { ok: true },
    isRead: false,
    hasEmitted: false,
    type: 'info',
    ...overrides,
  };
}

describe('Notification.fromRow', () => {
  it('round-trips every scalar column', () => {
    const row = buildRow();
    const entity = Notification.fromRow(row);
    expect(entity).toBeInstanceOf(Notification);
    assertRowRoundtrips(row, entity as unknown as Record<string, unknown> & { id: string });
  });

  it('dedupes by id within a shared context', () => {
    const ctx = new HydrationContext();
    const row = buildRow();
    expect(Notification.fromRow(row, ctx)).toBe(Notification.fromRow(row, ctx));
  });
});
