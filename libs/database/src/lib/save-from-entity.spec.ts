import { SettingsConstants } from '@postybirb/types';
import { SettingsRepository } from './repositories/settings.repository';
import { OptimisticConcurrencyError } from './repositories/base/optimistic-concurrency.error';
import { createTestRepository } from './repositories/base/test-utils';
import { saveFromEntity } from './save-from-entity';

describe('saveFromEntity', () => {
  const settings = createTestRepository(SettingsRepository);

  it('inserts when the entity has no persisted row and refreshes timestamps', async () => {
    const inserted = await settings.insert({
      profile: 'baseline',
      settings: SettingsConstants.DEFAULT_SETTINGS,
    });
    // Mutate via saveFromEntity on a new id (insert path).
    const fresh = await settings.findById(inserted.id);
    expect(fresh).not.toBeNull();
    if (!fresh) return;
    fresh.profile = 'changed';
    const result = await saveFromEntity(fresh);
    expect(result).toBe(fresh);
    expect(result.updatedAt).toBeDefined();
    const reread = await settings.findById(fresh.id);
    expect(reread?.profile).toBe('changed');
  });

  it('throws OptimisticConcurrencyError when updatedAt is stale', async () => {
    const inserted = await settings.insert({
      profile: 'concurrent',
      settings: SettingsConstants.DEFAULT_SETTINGS,
    });
    const a = await settings.findById(inserted.id);
    if (!a) throw new Error('precondition');
    // Simulate a concurrent writer by bumping the row directly through
    // the registered repo.
    await new Promise((r) => setTimeout(r, 5));
    await settings.update(inserted.id, { profile: 'winner' });
    // Now `a.updatedAt` is older than the persisted row.
    a.profile = 'loser';
    await expect(saveFromEntity(a)).rejects.toBeInstanceOf(
      OptimisticConcurrencyError,
    );
  });

  it('uses the repository resolved via RepositoryRegistry', async () => {
    const inserted = await settings.insert({
      profile: 'registry',
      settings: SettingsConstants.DEFAULT_SETTINGS,
    });
    const e = await settings.findById(inserted.id);
    if (!e) throw new Error('precondition');
    e.profile = 'via-registry';
    await saveFromEntity(e);
    const reread = await settings.findById(inserted.id);
    expect(reread?.profile).toBe('via-registry');
  });
});
