import type { ISubmissionMetadata } from '@postybirb/types';
import {
    ScheduleType,
    SubmissionType,
    UnitOfWorkState,
} from '@postybirb/types';
import { UnitOfWork } from '../entities/unit-of-work.entity';
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

  it('loads related units of work', async () => {
    const { account, post, submission } = await seedDependencies();
    const unitOfWork = await repos.unitOfWork.insert({
      postId: post.id,
      submissionId: submission.id,
      accountId: account.id,
    });

    const fetched = await repos.post.findById(post.id);
    expect(fetched?.unitsOfWork).toHaveLength(1);
    expect(fetched?.unitsOfWork[0]).toBeInstanceOf(UnitOfWork);
    expect(fetched?.unitsOfWork[0].id).toBe(unitOfWork.id);
  });

  it('allows only one post per submission', async () => {
    const { submission } = await seedDependencies();

    // `better-sqlite3`'s `SqliteError` is not a genuine `[object Error]`, so
    // `expect(...).rejects.toThrow()` only recognises it when `expect` happens
    // to be loaded in the same realm as the driver — which depends on the
    // installed `node_modules` layout and differs between local and CI.
    // Assert on the rejection value itself instead.
    const rejection = await repos.post
      .insert({ submissionId: submission.id })
      .then(
        () => undefined,
        (error: Error) => error,
      );

    expect(rejection?.message).toMatch(
      /UNIQUE constraint failed: post\.submissionId/,
    );
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

  it('completes a post when every active unit has settled', async () => {
    const { account, post, submission } = await seedDependencies();
    await repos.unitOfWork.insert([
      {
        postId: post.id,
        submissionId: submission.id,
        accountId: account.id,
        state: UnitOfWorkState.SUCCEEDED,
      },
      {
        postId: post.id,
        submissionId: submission.id,
        accountId: account.id,
        state: UnitOfWorkState.FAILED,
      },
      {
        postId: post.id,
        submissionId: submission.id,
        accountId: account.id,
        state: UnitOfWorkState.CANCELLED,
      },
    ]);

    await expect(
      repos.post.completeIfAllActiveUnitsSettled(post.id),
    ).resolves.toBe(true);
    await expect(repos.post.findByIdOrThrow(post.id)).resolves.toMatchObject({
      completed: true,
      cancelled: false,
    });
  });

  it.each([
    UnitOfWorkState.NEW,
    UnitOfWorkState.RATE_LIMITED,
  ])('does not complete a post with active %s work', async (state) => {
    const { account, post, submission } = await seedDependencies();
    await repos.unitOfWork.insert({
      postId: post.id,
      submissionId: submission.id,
      accountId: account.id,
      state,
    });

    await expect(
      repos.post.completeIfAllActiveUnitsSettled(post.id),
    ).resolves.toBe(false);
    await expect(repos.post.findByIdOrThrow(post.id)).resolves.toMatchObject({
      completed: false,
    });
  });

  it('cancels a post and only its active non-succeeded work', async () => {
    const { account, post, submission } = await seedDependencies();
    const [pending, succeeded, evicted] = await repos.unitOfWork.insert([
      {
        postId: post.id,
        submissionId: submission.id,
        accountId: account.id,
        state: UnitOfWorkState.PENDING,
      },
      {
        postId: post.id,
        submissionId: submission.id,
        accountId: account.id,
        state: UnitOfWorkState.SUCCEEDED,
      },
      {
        postId: post.id,
        submissionId: submission.id,
        accountId: account.id,
        state: UnitOfWorkState.FAILED,
        evicted: true,
      },
    ]);

    await repos.post.cancel(post.id);

    await expect(repos.post.findByIdOrThrow(post.id)).resolves.toMatchObject({
      completed: true,
      cancelled: true,
    });
    await expect(
      repos.unitOfWork.findByIdOrThrow(pending.id),
    ).resolves.toMatchObject({
      state: UnitOfWorkState.CANCELLED,
    });
    await expect(
      repos.unitOfWork.findByIdOrThrow(succeeded.id),
    ).resolves.toMatchObject({
      state: UnitOfWorkState.SUCCEEDED,
    });
    await expect(
      repos.unitOfWork.findByIdOrThrow(evicted.id),
    ).resolves.toMatchObject({
      state: UnitOfWorkState.FAILED,
    });
  });
});
