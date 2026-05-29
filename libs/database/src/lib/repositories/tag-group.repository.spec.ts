import { createTestRepository } from './base/test-utils';
import { TagGroupRepository } from './tag-group.repository';

describe('TagGroupRepository', () => {
  const repo = createTestRepository(TagGroupRepository);

  it('inserts and reads back', async () => {
    const e = await repo.insert({ name: 'g', tags: ['a', 'b'] });
    expect((await repo.findById(e.id))?.tags).toEqual(['a', 'b']);
  });

  it('rejects duplicate `name` (unique constraint)', async () => {
    await repo.insert({ name: 'dup', tags: [] });
    await expect(repo.insert({ name: 'dup', tags: [] })).rejects.toThrow();
  });

  it('update persists the change', async () => {
    const e = await repo.insert({ name: 'g', tags: [] });
    await repo.update(e.id, { tags: ['x'] });
    expect((await repo.findById(e.id))?.tags).toEqual(['x']);
  });
});
