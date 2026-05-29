import { SubscriberBus } from './base/subscriber-bus';
import { createTestRepository } from './base/test-utils';
import type { Action, SubscriberCb } from './base/types';
import { CustomShortcutRepository } from './custom-shortcut.repository';

describe('CustomShortcutRepository', () => {
  const repo = createTestRepository(CustomShortcutRepository);

  it('inserts and reads back the row', async () => {
    const e = await repo.insert({
      name: 'shortcut-a',
      shortcut: { type: 'doc', content: [] },
    });
    expect((await repo.findById(e.id))?.name).toBe('shortcut-a');
  });

  it('rejects duplicate `name` (unique constraint)', async () => {
    await repo.insert({
      name: 'dup',
      shortcut: { type: 'doc', content: [] },
    });
    let threw = false;
    try {
      await repo.insert({ name: 'dup', shortcut: { type: 'doc', content: [] } });
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
  });

  it('update fires subscriber and persists the change', async () => {
    const e = await repo.insert({
      name: 'orig',
      shortcut: { type: 'doc', content: [] },
    });
    const events: Array<[string[], Action]> = [];
    const cb: SubscriberCb = (ids, action) => events.push([ids, action]);
    SubscriberBus.subscribe('CustomShortcutSchema', cb);

    await repo.update(e.id, { name: 'renamed' });
    SubscriberBus.flush();

    expect(events.some(([, a]) => a === 'update')).toBe(true);
    expect((await repo.findById(e.id))?.name).toBe('renamed');
  });

  it('deleteById removes the row', async () => {
    const e = await repo.insert({
      name: 'gone',
      shortcut: { type: 'doc', content: [] },
    });
    await repo.deleteById([e.id]);
    expect(await repo.findById(e.id)).toBeNull();
  });
});
