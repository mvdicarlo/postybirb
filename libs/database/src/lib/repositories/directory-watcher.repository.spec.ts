import type { ISubmissionMetadata } from '@postybirb/types';
import {
    DirectoryWatcherImportAction,
    ScheduleType,
    SubmissionType,
} from '@postybirb/types';
import { createTestRepositories } from './base/test-utils';
import { DirectoryWatcherRepository } from './directory-watcher.repository';
import { SubmissionRepository } from './submission.repository';

describe('DirectoryWatcherRepository', () => {
  const repos = createTestRepositories({
    watcher: DirectoryWatcherRepository,
    submission: SubmissionRepository,
  });

  it('inserts a watcher and reads it back', async () => {
    const e = await repos.watcher.insert({
      path: '/tmp/x',
      importAction: DirectoryWatcherImportAction.NEW_SUBMISSION,
    });
    const fetched = await repos.watcher.findById(e.id);
    expect(fetched?.path).toBe('/tmp/x');
  });

  it('templateId FK uses ON DELETE SET NULL', async () => {
    const tpl = await repos.submission.insert({
      type: SubmissionType.FILE,
      isScheduled: false,
      isTemplate: true,
      isMultiSubmission: false,
      isArchived: false,
      isInitialized: false,
      schedule: { scheduleType: ScheduleType.NONE },
      metadata: {} as ISubmissionMetadata,
      order: 0,
    });
    const w = await repos.watcher.insert({
      path: '/tmp/y',
      templateId: tpl.id,
      importAction: DirectoryWatcherImportAction.NEW_SUBMISSION,
    });

    await repos.submission.deleteById([tpl.id]);

    const reread = await repos.watcher.findById(w.id);
    expect(reread).not.toBeNull();
    expect(reread?.templateId).toBeNull();
  });
});
