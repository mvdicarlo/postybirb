import { createTestRepository } from './base/test-utils';
import { UserConverterRepository } from './user-converter.repository';

describe('UserConverterRepository', () => {
  const repo = createTestRepository(UserConverterRepository);

  it('inserts and reads back', async () => {
    const e = await repo.insert({
      username: 'u1',
      convertTo: { fa: 'other-name' },
    });
    expect((await repo.findById(e.id))?.username).toBe('u1');
  });

  it('rejects duplicate `username` (unique constraint)', async () => {
    await repo.insert({ username: 'dup', convertTo: {} });
    await expect(
      repo.insert({ username: 'dup', convertTo: {} }),
    ).rejects.toThrow();
  });
});
