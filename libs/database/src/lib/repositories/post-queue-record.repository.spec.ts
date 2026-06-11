import type { ISubmissionMetadata } from '@postybirb/types';
import { ScheduleType, SubmissionType } from '@postybirb/types';
import { createTestRepositories } from './base/test-utils';
import { PostQueueRecordRepository } from './post-queue-record.repository';
import { SubmissionRepository } from './submission.repository';

describe('PostQueueRecordRepository', () => {
  const repos = createTestRepositories({
    submission: SubmissionRepository,
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

  it('submissionId FK cascades on delete', async () => {
    const subId = await seedSubmission();
    const q = await repos.queue.insert({ submissionId: subId });
    await repos.submission.deleteById([subId]);
    expect(await repos.queue.findById(q.id)).toBeNull();
  });
});
