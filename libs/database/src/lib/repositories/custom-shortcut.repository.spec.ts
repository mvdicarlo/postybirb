import { createTestRepository } from './base/test-utils';
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

  it('update persists the change', async () => {
    const e = await repo.insert({
      name: 'orig',
      shortcut: { type: 'doc', content: [] },
    });

    await repo.update(e.id, { name: 'renamed' });

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
