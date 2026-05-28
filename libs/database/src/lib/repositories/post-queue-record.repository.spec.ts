import {
  PostRecordResumeMode,
  PostRecordState,
  ScheduleType,
  SubmissionType,
} from '@postybirb/types';
import type { ISubmissionMetadata } from '@postybirb/types';
import { PostQueueRecordRepository } from './post-queue-record.repository';
import { PostRecordRepository } from './post-record.repository';
import { SubmissionRepository } from './submission.repository';
import { createTestRepositories } from './base/test-utils';

describe('PostQueueRecordRepository', () => {
  const repos = createTestRepositories({
    submission: SubmissionRepository,
    record: PostRecordRepository,
    queue: PostQueueRecordRepository,
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

  it('inserts and reads back a queue record', async () => {
    const subId = await seedSubmission();
    const e = await repos.queue.insert({ submissionId: subId });
    expect((await repos.queue.findById(e.id))?.submissionId).toBe(subId);
  });

  it('postRecordId FK uses ON DELETE SET NULL', async () => {
    const subId = await seedSubmission();
    const rec = await repos.record.insert({
      submissionId: subId,
      state: PostRecordState.PENDING,
      resumeMode: PostRecordResumeMode.NEW,
    });
    const q = await repos.queue.insert({
      submissionId: subId,
      postRecordId: rec.id,
    });
    await repos.record.deleteById([rec.id]);
    const reread = await repos.queue.findById(q.id);
    expect(reread?.postRecordId).toBeNull();
  });

  it('submissionId FK cascades on delete', async () => {
    const subId = await seedSubmission();
    const q = await repos.queue.insert({ submissionId: subId });
    await repos.submission.deleteById([subId]);
    expect(await repos.queue.findById(q.id)).toBeNull();
  });
});
