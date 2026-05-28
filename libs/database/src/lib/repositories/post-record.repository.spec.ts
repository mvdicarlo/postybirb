import {
  PostRecordResumeMode,
  PostRecordState,
  ScheduleType,
  SubmissionType,
} from '@postybirb/types';
import type { ISubmissionMetadata } from '@postybirb/types';
import { PostRecordRepository } from './post-record.repository';
import { SubmissionRepository } from './submission.repository';
import { createTestRepositories } from './base/test-utils';

describe('PostRecordRepository', () => {
  const repos = createTestRepositories({
    submission: SubmissionRepository,
    record: PostRecordRepository,
  });

  async function seedSubmission(): Promise<string> {
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
    return sub.id;
  }

  it('inserts with default state PENDING / resumeMode CONTINUE', async () => {
    const subId = await seedSubmission();
    const e = await repos.record.insert({ submissionId: subId });
    const fetched = await repos.record.findById(e.id);
    expect(fetched?.state).toBe(PostRecordState.PENDING);
    expect(fetched?.resumeMode).toBe(PostRecordResumeMode.CONTINUE);
  });

  it('origin/chained records: deleting origin sets originPostRecordId NULL on chain', async () => {
    const subId = await seedSubmission();
    const origin = await repos.record.insert({
      submissionId: subId,
      resumeMode: PostRecordResumeMode.NEW,
    });
    const chained = await repos.record.insert({
      submissionId: subId,
      resumeMode: PostRecordResumeMode.CONTINUE,
      originPostRecordId: origin.id,
    });
    await repos.record.deleteById([origin.id]);
    const reread = await repos.record.findById(chained.id);
    expect(reread).not.toBeNull();
    expect(reread?.originPostRecordId).toBeNull();
  });

  it('submissionId FK cascades on delete', async () => {
    const subId = await seedSubmission();
    const rec = await repos.record.insert({ submissionId: subId });
    await repos.submission.deleteById([subId]);
    expect(await repos.record.findById(rec.id)).toBeNull();
  });
});
