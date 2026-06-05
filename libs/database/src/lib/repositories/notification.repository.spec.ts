import { SubscriberBus } from './base/subscriber-bus';
import { createTestRepository } from './base/test-utils';
import type { Action, SubscriberCb } from './base/types';
import { NotificationRepository } from './notification.repository';

describe('NotificationRepository', () => {
  const repo = createTestRepository(NotificationRepository);

  it('inserts a notification with default flags applied', async () => {
    const e = await repo.insert({
      title: 't',
      message: 'm',
      tags: ['x'],
      data: { kind: 'demo' },
      type: 'info',
    });
    const fetched = await repo.findById(e.id);
    expect(fetched?.isRead).toBe(false);
    expect(fetched?.hasEmitted).toBe(false);
    expect(fetched?.tags).toEqual(['x']);
  });

  it('update fires subscriber when flags change', async () => {
    const e = await repo.insert({
      title: 't',
      message: 'm',
      tags: [],
      data: {},
      type: 'info',
    });
    const events: Array<[string[], Action]> = [];
    const cb: SubscriberCb = (ids, action) => events.push([ids, action]);
    SubscriberBus.subscribe('NotificationSchema', cb);

    await repo.update(e.id, { isRead: true });
    SubscriberBus.flush();

    expect(events.some(([, a]) => a === 'update')).toBe(true);
    expect((await repo.findById(e.id))?.isRead).toBe(true);
  });
});
