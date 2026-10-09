import type {
    ISubmissionMetadata,
    SubmissionFileMetadata,
} from '@postybirb/types';
import {
    ScheduleType,
    SubmissionType,
} from '@postybirb/types';
import { createTestRepositories } from './base/test-utils';
import { FileBufferRepository } from './file-buffer.repository';
import { SubmissionFileRepository } from './submission-file.repository';
import { SubmissionRepository } from './submission.repository';

describe('FileBufferRepository', () => {
  const repos = createTestRepositories({
    sub: SubmissionRepository,
    file: SubmissionFileRepository,
    buffer: FileBufferRepository,
  });

  async function seedSubmissionFile(): Promise<string> {
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
    const sf = await repos.file.insert({
      submissionId: sub.id,
      fileName: 'a.png',
      hash: 'h',
      mimeType: 'image/png',
      size: 1,
      width: 1,
      height: 1,
      hasThumbnail: false,
      metadata: {} as SubmissionFileMetadata,
    });
    return sf.id;
  }

  it('inserts a buffer attached to a submission-file', async () => {
    const sfId = await seedSubmissionFile();
    const e = await repos.buffer.insert({
      submissionFileId: sfId,
      buffer: Buffer.from([1, 2, 3]),
      fileName: 'a.png',
      mimeType: 'image/png',
      size: 3,
      width: 1,
      height: 1,
    });
    const fetched = await repos.buffer.findById(e.id);
    expect(fetched?.size).toBe(3);
    expect(fetched?.buffer).toEqual(Buffer.from([1, 2, 3]));
  });

  it('cascades delete when the parent submission-file is removed', async () => {
    const sfId = await seedSubmissionFile();
    const buf = await repos.buffer.insert({
      submissionFileId: sfId,
      buffer: Buffer.from([1]),
      fileName: 'a',
      mimeType: 'image/png',
      size: 1,
      width: 1,
      height: 1,
    });
    await repos.file.deleteById([sfId]);
    expect(await repos.buffer.findById(buf.id)).toBeNull();
  });
});
