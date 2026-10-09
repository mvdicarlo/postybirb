import type { ISubmissionMetadata } from '@postybirb/types';
import {
    ScheduleType,
    SubmissionType,
    UnitOfWorkState,
} from '@postybirb/types';
import { AccountRepository } from './account.repository';
import { createTestRepositories } from './base/test-utils';
import { PostRepository } from './post.repository';
import { SubmissionRepository } from './submission.repository';
import { UnitOfWorkRepository } from './unit-of-work.repository';

describe('UnitOfWorkRepository', () => {
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

  it('persists defaults and JSON data', async () => {
    const { account, post, submission } = await seedDependencies();
    const unitOfWork = await repos.unitOfWork.insert({
      postId: post.id,
      submissionId: submission.id,
      accountId: account.id,
      data: { request: true },
      response: { status: 201 },
    });

    const fetched = await repos.unitOfWork.findById(unitOfWork.id);
    expect(fetched?.attempt).toBe(0);
    expect(fetched?.evicted).toBe(false);
    expect(fetched?.state).toBe(UnitOfWorkState.NEW);
    expect(fetched?.data).toEqual({ request: true });
    expect(fetched?.response).toEqual({ status: 201 });
  });

  it('deleting an account cascades to its units of work', async () => {
    const { account, post, submission } = await seedDependencies();
    const unitOfWork = await repos.unitOfWork.insert({
      postId: post.id,
      submissionId: submission.id,
      accountId: account.id,
    });

    await repos.account.deleteById([account.id]);
    expect(await repos.unitOfWork.findById(unitOfWork.id)).toBeNull();
  });
});