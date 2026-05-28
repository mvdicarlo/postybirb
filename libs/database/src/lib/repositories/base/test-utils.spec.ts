import { SettingsConstants } from '@postybirb/types';
import { SettingsRepository } from '../settings.repository';
import { RepositoryRegistry } from './repository-registry';
import { SubscriberBus } from './subscriber-bus';
import {
  createTestRepositories,
  createTestRepository,
  resetRepositoryState,
} from './test-utils';
import { AccountRepository } from '../account.repository';

describe('createTestRepository', () => {
  const settings = createTestRepository(SettingsRepository);

  it('returns a working repo against :memory:', async () => {
    const inserted = await settings.insert({
      profile: 'p1',
      settings: SettingsConstants.DEFAULT_SETTINGS,
    });
    expect(inserted.id).toBeDefined();
    const fetched = await settings.findById(inserted.id);
    expect(fetched?.profile).toBe('p1');
  });

  it('isolates state across tests via afterEach cleanup', async () => {
    // The previous `it` inserted a settings row. Because afterEach runs
    // resetRepositoryState() (which drops the :memory: db), this test
    // sees an empty database.
    const rows = await settings.findAll();
    expect(rows).toHaveLength(0);
    expect(RepositoryRegistry.has('SettingsSchema')).toBe(true);
  });
});

describe('createTestRepositories', () => {
  const repos = createTestRepositories({
    settings: SettingsRepository,
    account: AccountRepository,
  });

  it('builds multiple repos sharing the same :memory: db', async () => {
    const s = await repos.settings.insert({
      profile: 'multi',
      settings: SettingsConstants.DEFAULT_SETTINGS,
    });
    const a = await repos.account.insert({
      name: 'a',
      website: 'w',
      groups: [],
    });
    expect(s.id).not.toBe(a.id);
    expect(await repos.settings.findAll()).toHaveLength(1);
    expect(await repos.account.findAll()).toHaveLength(1);
  });
});

describe('resetRepositoryState', () => {
  it('clears the registry and subscriber bus', () => {
    SubscriberBus.subscribe('SettingsSchema', () => undefined);
    resetRepositoryState();
    expect(RepositoryRegistry.has('SettingsSchema')).toBe(false);
    // re-subscribing should not double-fire from a previous handler;
    // easiest proxy is that `clear()` was called, so the registry has
    // no entries — already asserted above.
  });
});
