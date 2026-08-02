import type { ISubmissionMetadata } from '@postybirb/types';
import { ScheduleType, SubmissionType } from '@postybirb/types';
import { AccountRepository } from './account.repository';
import { createTestRepositories } from './base/test-utils';
import { PostRepository } from './post.repository';
import { SubmissionRepository } from './submission.repository';
import { UnitOfWorkRepository } from './unit-of-work.repository';

describe('PostRepository', () => {
  const repos = createTestRepositories({
    account: AccountRepository,
    post: PostRepository,
    submission: SubmissionRepository,
    unitOfWork: UnitOfWorkRepository,
  });

  async function seedDependencies() {
    const account = await repos.account.insert({
      name: 'account',
      website: 'website',
      groups: [],
    });
    const submission = await repos.submission.insert({
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
    const post = await repos.post.insert({ submissionId: submission.id });
    return { account, post, submission };
  }

  it('inserts with completion and cancellation defaulted to false', async () => {
    const { post } = await seedDependencies();
    const fetched = await repos.post.findById(post.id);

    expect(fetched?.completed).toBe(false);
    expect(fetched?.cancelled).toBe(false);
    expect(fetched?.unitsOfWork).toEqual([]);
  });

  it('loads related unit-of-work ids', async () => {
    const { account, post, submission } = await seedDependencies();
    const unitOfWork = await repos.unitOfWork.insert({
      postId: post.id,
      submissionId: submission.id,
      accountId: account.id,
    });

    const fetched = await repos.post.findById(post.id);
    expect(fetched?.unitsOfWork).toEqual([unitOfWork.id]);
  });

  it('deleting a post cascades to its units of work', async () => {
    const { account, post, submission } = await seedDependencies();
    const unitOfWork = await repos.unitOfWork.insert({
      postId: post.id,
      submissionId: submission.id,
      accountId: account.id,
    });

    await repos.post.deleteById([post.id]);
    expect(await repos.unitOfWork.findById(unitOfWork.id)).toBeNull();
  });
});