import { createTestRepository } from './base/test-utils';
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

  it('update persists changed flags', async () => {
    const e = await repo.insert({
      title: 't',
      message: 'm',
      tags: [],
      data: {},
      type: 'info',
    });

    await repo.update(e.id, { isRead: true });

    expect((await repo.findById(e.id))?.isRead).toBe(true);
  });
});
