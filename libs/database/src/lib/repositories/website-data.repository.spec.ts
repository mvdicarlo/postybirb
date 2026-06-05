import { AccountRepository } from './account.repository';
import { createTestRepositories } from './base/test-utils';
import { WebsiteDataRepository } from './website-data.repository';

describe('WebsiteDataRepository', () => {
  const repos = createTestRepositories({
    account: AccountRepository,
    websiteData: WebsiteDataRepository,
  });

  it('inserts and reads back keyed on account id', async () => {
    const acct = await repos.account.insert({
      name: 'a',
      website: 'w',
      groups: [],
    });
    const wd = await repos.websiteData.insert({
      id: acct.id,
      data: { token: 'abc' },
    });
    expect(wd.id).toBe(acct.id);
    expect((await repos.websiteData.findById(acct.id))?.data).toEqual({
      token: 'abc',
    });
  });

  it('account delete cascades to website-data', async () => {
    const acct = await repos.account.insert({
      name: 'a',
      website: 'w',
      groups: [],
    });
    await repos.websiteData.insert({ id: acct.id, data: {} });
    await repos.account.deleteById([acct.id]);
    expect(await repos.websiteData.findById(acct.id)).toBeNull();
  });
});
