import { ScheduleType, SubmissionType } from '@postybirb/types';
import type {
  ISubmissionMetadata,
  IWebsiteFormFields,
} from '@postybirb/types';
import { AccountRepository } from './account.repository';
import { SubmissionRepository } from './submission.repository';
import { WebsiteOptionsRepository } from './website-options.repository';
import { createTestRepositories } from './base/test-utils';

describe('WebsiteOptionsRepository', () => {
  const repos = createTestRepositories({
    account: AccountRepository,
    submission: SubmissionRepository,
    options: WebsiteOptionsRepository,
  });

  async function seed(): Promise<{ accountId: string; submissionId: string }> {
    const acct = await repos.account.insert({
      name: 'a',
      website: 'w',
      groups: [],
    });
    const sub = await repos.submission.insert({
      type: SubmissionType.FILE,
      isScheduled: false,
      isTemplate: false,
      isMultiSubmission: false,
      isArchived: false,
      isInitialized: false,
      schedule: { scheduleType: ScheduleType.NONE },
      metadata: {} as ISubmissionMetadata,
      order: 0,
    });
    return { accountId: acct.id, submissionId: sub.id };
  }

  it('applies defaultWith { account, submission } on findById', async () => {
    const { accountId, submissionId } = await seed();
    const e = await repos.options.insert({
      accountId,
      submissionId,
      data: { title: 't' } as IWebsiteFormFields,
      isDefault: true,
    });
    const fetched = await repos.options.findById(e.id);
    expect(fetched?.account?.id).toBe(accountId);
    expect(fetched?.submission?.id).toBe(submissionId);
  });

  it('cascades on account delete', async () => {
    const { accountId, submissionId } = await seed();
    const e = await repos.options.insert({
      accountId,
      submissionId,
      data: {} as IWebsiteFormFields,
      isDefault: false,
    });
    await repos.account.deleteById([accountId]);
    expect(await repos.options.findById(e.id)).toBeNull();
  });

  it('cascades on submission delete', async () => {
    const { accountId, submissionId } = await seed();
    const e = await repos.options.insert({
      accountId,
      submissionId,
      data: {} as IWebsiteFormFields,
      isDefault: false,
    });
    await repos.submission.deleteById([submissionId]);
    expect(await repos.options.findById(e.id)).toBeNull();
  });
});
