import { createTestRepository } from './base/test-utils';
import { TagConverterRepository } from './tag-converter.repository';

describe('TagConverterRepository', () => {
  const repo = createTestRepository(TagConverterRepository);

  it('inserts and reads back', async () => {
    const e = await repo.insert({ tag: 'foo', convertTo: { twitter: 'bar' } });
    const fetched = await repo.findById(e.id);
    expect(fetched?.tag).toBe('foo');
    expect(fetched?.convertTo).toEqual({ twitter: 'bar' });
  });

  it('rejects duplicate `tag` (unique constraint)', async () => {
    await repo.insert({ tag: 'dup', convertTo: {} });
    await expect(
      repo.insert({ tag: 'dup', convertTo: {} }),
    ).rejects.toThrow();
  });

  it('deleteById removes the row', async () => {
    const e = await repo.insert({ tag: 't', convertTo: {} });
    await repo.deleteById([e.id]);
    expect(await repo.findById(e.id)).toBeNull();
  });
});
