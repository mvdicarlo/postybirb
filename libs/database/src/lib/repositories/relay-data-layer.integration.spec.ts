import type { ISubmissionMetadata } from '@postybirb/types';
import {
    NodeStatus,
    PostRecordResumeMode,
    ScheduleType,
    SubmissionType,
    UnitKind,
} from '@postybirb/types';
import { createTestRepositories } from './base/test-utils';
import { PostJobRepository } from './post-job.repository';
import { PostRateWindowRepository } from './post-rate-window.repository';
import { PostTaskRepository } from './post-task.repository';
import { PostUnitRepository } from './post-unit.repository';
import { SubmissionRepository } from './submission.repository';

describe('Relay data layer (PR#1)', () => {
  const repos = createTestRepositories({
    submission: SubmissionRepository,
    job: PostJobRepository,
    task: PostTaskRepository,
    unit: PostUnitRepository,
    rate: PostRateWindowRepository,
  });

  async function seedSubmission(): Promise<string> {
    const sub = await repos.submission.insert({
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

  it('persists a job, task and unit tree and hydrates it', async () => {
    const submissionId = await seedSubmission();

    const job = await repos.job.insert({
      submissionId,
      status: NodeStatus.QUEUED,
      resumeMode: PostRecordResumeMode.NEW,
    });

    const task = await repos.task.insert({
      jobId: job.id,
      websiteId: 'weasyl',
      status: NodeStatus.QUEUED,
      dependency: { mode: 'any', tasks: ['t1', 't2'] },
      idempotencyKey: `${job.id}:weasyl`,
      maxAttempts: 3,
      attempts: 0,
    });

    await repos.unit.insert({
      taskId: task.id,
      kind: UnitKind.BATCH,
      ordinal: 0,
      status: NodeStatus.QUEUED,
      fileIds: ['f1', 'f2'],
    });

    const active = await repos.job.findActive();
    expect(active).toHaveLength(1);
    expect(active[0].tasks).toHaveLength(1);
    expect(active[0].tasks[0].dependency).toEqual({
      mode: 'any',
      tasks: ['t1', 't2'],
    });
    expect(active[0].tasks[0].units).toHaveLength(1);
    expect(active[0].tasks[0].units[0].fileIds).toEqual(['f1', 'f2']);
  });

  it('excludes terminal jobs from findActive', async () => {
    const submissionId = await seedSubmission();
    await repos.job.insert({
      submissionId,
      status: NodeStatus.SUCCEEDED,
      resumeMode: PostRecordResumeMode.NEW,
    });
    expect(await repos.job.findActive()).toHaveLength(0);
    expect(await repos.job.findBySubmission(submissionId)).toHaveLength(1);
  });

  it('looks up a rate window by key', async () => {
    const now = new Date().toISOString();
    await repos.rate.insert({ key: 'a:acct1', lastPostedAt: now });
    const found = await repos.rate.findByKey('a:acct1');
    expect(found?.lastPostedAt).toEqual(now);
    expect(await repos.rate.findByKey('missing')).toBeNull();
  });

  it('cascades unit and task deletes when a job is removed', async () => {
    const submissionId = await seedSubmission();
    const job = await repos.job.insert({
      submissionId,
      status: NodeStatus.QUEUED,
      resumeMode: PostRecordResumeMode.NEW,
    });
    const task = await repos.task.insert({
      jobId: job.id,
      websiteId: 'furaffinity',
      status: NodeStatus.QUEUED,
      idempotencyKey: `${job.id}:furaffinity`,
    });
    await repos.unit.insert({
      taskId: task.id,
      kind: UnitKind.MESSAGE,
      ordinal: 0,
      status: NodeStatus.QUEUED,
      fileIds: [],
    });

    await repos.job.deleteById([job.id]);

    expect(await repos.task.findByJob(job.id)).toHaveLength(0);
    expect(await repos.unit.findByTask(task.id)).toHaveLength(0);
  });
});
