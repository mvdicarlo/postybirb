import { SubmissionType } from '@postybirb/types';
import { AccountRepository } from './account.repository';
import { UserSpecifiedWebsiteOptionsRepository } from './user-specified-website-options.repository';
import { createTestRepositories } from './base/test-utils';

describe('UserSpecifiedWebsiteOptionsRepository', () => {
  const repos = createTestRepositories({
    account: AccountRepository,
    uswo: UserSpecifiedWebsiteOptionsRepository,
  });

  it('inserts and reads back', async () => {
    const acct = await repos.account.insert({
      name: 'a',
      website: 'w',
      groups: [],
    });
    const e = await repos.uswo.insert({
      accountId: acct.id,
      type: SubmissionType.FILE,
      options: { foo: 'bar' },
    });
    expect((await repos.uswo.findById(e.id))?.accountId).toBe(acct.id);
  });

  it('accountId FK cascades on delete', async () => {
    const acct = await repos.account.insert({
      name: 'a',
      website: 'w',
      groups: [],
    });
    const e = await repos.uswo.insert({
      accountId: acct.id,
      type: SubmissionType.MESSAGE,
      options: {},
    });
    await repos.account.deleteById([acct.id]);
    expect(await repos.uswo.findById(e.id)).toBeNull();
  });
});
