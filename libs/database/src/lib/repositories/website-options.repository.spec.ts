import type {
    ISubmissionMetadata,
    IWebsiteFormFields,
} from '@postybirb/types';
import { DefaultDescriptionValue, ScheduleType, SubmissionType } from '@postybirb/types';
import { v4 } from 'uuid';
import { AccountRepository } from './account.repository';
import { createTestRepositories } from './base/test-utils';
import { SubmissionRepository } from './submission.repository';
import { WebsiteOptionsRepository } from './website-options.repository';

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

  it('atomically rejects stale description writes', async () => {
    const { accountId, submissionId } = await seed();
    const description = DefaultDescriptionValue();
    const option = await repos.options.insert({
      accountId,
      submissionId,
      data: { description },
      isDefault: true,
    });
    const [first, stale] = await Promise.all([
      repos.options.updateData(
        option.id,
        { description },
        { value: description, expectedRevision: 0, mutationId: v4() },
        true,
      ),
      repos.options.updateData(
        option.id,
        { description: { ...description, insertTags: true } },
        { value: description, expectedRevision: 0, mutationId: v4() },
        true,
      ),
    ]);
    expect(first?.data.description?.version?.revision).toBe(1);
    expect(stale).toBeNull();
    expect(
      (await repos.options.findByIdOrThrow(option.id)).data.description,
    ).toEqual(first?.data.description);
  });

  it('records equal-content replacements, but not templates that omit descriptions', async () => {
    const { accountId, submissionId } = await seed();
    const description = DefaultDescriptionValue();
    const option = await repos.options.insert({
      accountId,
      submissionId,
      data: { title: 'Original', description },
      isDefault: true,
    });
    const unrelated = await repos.options.updateData(
      option.id,
      { rating: undefined },
      'replace',
      true,
    );
    expect(unrelated?.data.description).toEqual(description);
    const replacement = await repos.options.updateData(
      option.id,
      { description },
      'replace',
      true,
    );
    expect(replacement?.data.description?.version).toEqual({
      revision: 1,
      mutationId: null,
      replacementRevision: 1,
    });
    const repeated = await repos.options.updateData(
      option.id,
      { description },
      'replace',
      true,
    );
    expect(repeated?.data.description?.version?.replacementRevision).toBe(2);
    expect(repeated?.data.title).toBe('Original');
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
