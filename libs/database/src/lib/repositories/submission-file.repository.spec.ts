import type {
    ISubmissionMetadata,
    SubmissionFileMetadata,
} from '@postybirb/types';
import { ScheduleType, SubmissionType } from '@postybirb/types';
import { createTestRepositories } from './base/test-utils';
import { FileBufferRepository } from './file-buffer.repository';
import { SubmissionFileRepository } from './submission-file.repository';
import { SubmissionRepository } from './submission.repository';

describe('SubmissionFileRepository', () => {
  const repos = createTestRepositories({
    sub: SubmissionRepository,
    file: SubmissionFileRepository,
    buffer: FileBufferRepository,
  });

  async function seedSubmission(): Promise<string> {
    const sub = await repos.sub.insert({
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
    return sub.id;
  }

  it('inserts and reads back a submission-file', async () => {
    const subId = await seedSubmission();
    const e = await repos.file.insert({
      submissionId: subId,
      fileName: 'x.png',
      hash: 'h',
      mimeType: 'image/png',
      size: 1,
      width: 1,
      height: 1,
      hasThumbnail: false,
      metadata: {} as SubmissionFileMetadata,
    });
    const fetched = await repos.file.findById(e.id);
    expect(fetched?.fileName).toBe('x.png');
  });

  it('cascades delete when the parent submission is removed', async () => {
    const subId = await seedSubmission();
    const e = await repos.file.insert({
      submissionId: subId,
      fileName: 'x.png',
      hash: 'h',
      mimeType: 'image/png',
      size: 1,
      width: 1,
      height: 1,
      hasThumbnail: false,
      metadata: {} as SubmissionFileMetadata,
    });
    await repos.sub.deleteById([subId]);
    expect(await repos.file.findById(e.id)).toBeNull();
  });
});
