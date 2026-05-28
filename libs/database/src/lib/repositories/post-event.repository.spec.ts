import {
  PostEventType,
  PostRecordResumeMode,
  PostRecordState,
  ScheduleType,
  SubmissionType,
} from '@postybirb/types';
import type { ISubmissionMetadata } from '@postybirb/types';
import { AccountRepository } from './account.repository';
import { PostEventRepository } from './post-event.repository';
import { PostRecordRepository } from './post-record.repository';
import { SubmissionRepository } from './submission.repository';
import { createTestRepositories } from './base/test-utils';

describe('PostEventRepository', () => {
  const repos = createTestRepositories({
    account: AccountRepository,
    submission: SubmissionRepository,
    record: PostRecordRepository,
    event: PostEventRepository,
  });

  async function seed(): Promise<{ accountId: string; recordId: string }> {
    const acct = await repos.account.insert({
      name: 'a',
      website: 'w',
      groups: [],
    });
    const sub = await repos.submission.insert({
      type: SubmissionType.MESSAGE,
      isScheduled: false,
      isTemplate: false,
      isMultiSubmission: false,
      isArchived: false,
      isInitialized: false,
      schedule: { scheduleType: ScheduleType.NONE },
      metadata: {} as ISubmissionMetadata,
      order: 0,
    });
    const rec = await repos.record.insert({
      submissionId: sub.id,
      state: PostRecordState.PENDING,
      resumeMode: PostRecordResumeMode.NEW,
    });
    return { accountId: acct.id, recordId: rec.id };
  }

  it('applies defaultWith { account: true } on findById', async () => {
    const { accountId, recordId } = await seed();
    const e = await repos.event.insert({
      postRecordId: recordId,
      accountId,
      eventType: PostEventType.POST_ATTEMPT_STARTED,
    });
    const fetched = await repos.event.findById(e.id);
    expect(fetched?.account?.id).toBe(accountId);
  });

  it('accountId FK uses ON DELETE SET NULL', async () => {
    const { accountId, recordId } = await seed();
    const e = await repos.event.insert({
      postRecordId: recordId,
      accountId,
      eventType: PostEventType.POST_ATTEMPT_STARTED,
    });
    await repos.account.deleteById([accountId]);
    const reread = await repos.event.findById(e.id);
    expect(reread).not.toBeNull();
    expect(reread?.accountId).toBeNull();
  });

  it('postRecordId FK cascades on delete', async () => {
    const { recordId } = await seed();
    const e = await repos.event.insert({
      postRecordId: recordId,
      eventType: PostEventType.POST_ATTEMPT_STARTED,
    });
    await repos.record.deleteById([recordId]);
    expect(await repos.event.findById(e.id)).toBeNull();
  });
});
