import { AccountRepository } from './account.repository';
import { createTestRepositories } from './base/test-utils';
import { WebsiteDataRepository } from './website-data.repository';

describe('AccountRepository', () => {
  const repos = createTestRepositories({
    account: AccountRepository,
    websiteData: WebsiteDataRepository,
  });

  it('inserts and reads back without eager-loaded relations', async () => {
    const e = await repos.account.insert({
      name: 'a1',
      website: 'demo',
      groups: ['g'],
    });
    const fetched = await repos.account.findById(e.id);
    expect(fetched?.name).toBe('a1');
    expect(fetched?.websiteData).toBeUndefined();
  });

  it('update persists the change', async () => {
    const e = await repos.account.insert({
      name: 'a1',
      website: 'demo',
      groups: [],
    });

    await repos.account.update(e.id, { name: 'renamed' });

    const reread = await repos.account.findById(e.id);
    expect(reread?.name).toBe('renamed');
  });

  it('delete cascades to dependent website-data row', async () => {
    const acct = await repos.account.insert({
      name: 'a',
      website: 'demo',
      groups: [],
    });
    await repos.websiteData.insert({ id: acct.id, data: {} });
    expect(await repos.websiteData.findById(acct.id)).not.toBeNull();

    await repos.account.deleteById([acct.id]);

    expect(await repos.account.findById(acct.id)).toBeNull();
    expect(await repos.websiteData.findById(acct.id)).toBeNull();
  });
});
