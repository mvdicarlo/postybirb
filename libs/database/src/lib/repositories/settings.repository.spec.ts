import { SettingsConstants } from '@postybirb/types';
import { createTestRepository } from './base/test-utils';
import { SettingsRepository } from './settings.repository';

describe('SettingsRepository', () => {
  const repo = createTestRepository(SettingsRepository);

  it('inserts and reads back a settings row with defaults', async () => {
    const e = await repo.insert({
      profile: 'main',
      settings: SettingsConstants.DEFAULT_SETTINGS,
    });
    const fetched = await repo.findById(e.id);
    expect(fetched?.profile).toBe('main');
  });

  it('rejects duplicate `profile` (unique constraint)', async () => {
    await repo.insert({
      profile: 'dup',
      settings: SettingsConstants.DEFAULT_SETTINGS,
    });
    await expect(
      repo.insert({
        profile: 'dup',
        settings: SettingsConstants.DEFAULT_SETTINGS,
      }),
    ).rejects.toThrow();
  });

  it('update persists settings change', async () => {
    const e = await repo.insert({
      profile: 'p',
      settings: SettingsConstants.DEFAULT_SETTINGS,
    });
    const next = { ...SettingsConstants.DEFAULT_SETTINGS, language: 'es' };
    await repo.update(e.id, { settings: next });
    const reread = await repo.findById(e.id);
    expect(reread?.settings).toEqual(next);
  });
});
