import {
  AccountRepository,
  PostJobRepository,
  SubmissionRepository,
  clearDatabase,
} from '@postybirb/database';
import type { ISubmissionMetadata } from '@postybirb/types';
import {
  NodeStatus,
  PostRecordResumeMode,
  ScheduleType,
  SubmissionType,
  UnitKind,
} from '@postybirb/types';
import { RelayJob, RelayTask, RelayUnit } from './model';
import { RelayPersistence } from './persistence';

async function seed(): Promise<{ submissionId: string; accountId: string }> {
  const account = await new AccountRepository().insert({
    name: 'acct',
    website: 'weasyl',
    groups: [],
  });
  const submission = await new SubmissionRepository().insert({
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
  return { submissionId: submission.id, accountId: account.id };
}

function buildJob(submissionId: string, accountId: string): RelayJob {
  const job = new RelayJob({ submissionId, resumeMode: PostRecordResumeMode.NEW });
  const task = new RelayTask({
    id: `${job.id}:t:weasyl:${accountId}`,
    jobId: job.id,
    accountId,
    websiteId: 'weasyl',
    idempotencyKey: `${job.id}:weasyl:${accountId}`,
    dependency: { mode: 'any', tasks: ['x'] },
  });
  task.units.push(
    new RelayUnit({
      id: `${task.id}:b0`,
      taskId: task.id,
      kind: UnitKind.BATCH,
      ordinal: 0,
      fileIds: ['f1', 'f2'],
    }),
  );
  job.tasks.push(task);
  return job;
}

describe('RelayPersistence', () => {
  beforeEach(() => clearDatabase());

  it('creates and reloads a job tree', async () => {
    const { submissionId, accountId } = await seed();
    const persistence = new RelayPersistence();
    const job = buildJob(submissionId, accountId);
    await persistence.create(job, 'test');

    const active = await persistence.loadActive();
    expect(active).toHaveLength(1);
    const loaded = active[0];
    expect(loaded.id).toBe(job.id);
    expect(loaded.submissionId).toBe(submissionId);
    expect(loaded.tasks).toHaveLength(1);
    expect(loaded.tasks[0].dependency).toEqual({ mode: 'any', tasks: ['x'] });
    expect(loaded.tasks[0].units[0].fileIds).toEqual(['f1', 'f2']);
    expect(loaded.tasks[0].units[0].status).toBe(NodeStatus.QUEUED);
  });

  it('persists transitions via save/saveTask', async () => {
    const { submissionId, accountId } = await seed();
    const persistence = new RelayPersistence();
    const job = buildJob(submissionId, accountId);
    await persistence.create(job);

    job.tasks[0].status = NodeStatus.SUCCEEDED;
    job.tasks[0].sourceUrl = 'https://weasyl/x';
    job.tasks[0].units[0].status = NodeStatus.SUCCEEDED;
    job.tasks[0].units[0].sourceUrl = 'https://weasyl/x';
    await persistence.saveTask(job.tasks[0]);

    job.status = NodeStatus.SUCCEEDED;
    job.completedAt = Date.now();
    await persistence.save(job);

    expect(await persistence.loadActive()).toHaveLength(0);

    const reloaded = await new PostJobRepository().findById(job.id);
    expect(reloaded?.status).toBe(NodeStatus.SUCCEEDED);
    expect(reloaded?.tasks[0].sourceUrl).toBe('https://weasyl/x');
    expect(reloaded?.tasks[0].units[0].status).toBe(NodeStatus.SUCCEEDED);
  });

  it('loadActive returns RUNNING jobs for crash recovery', async () => {
    const { submissionId, accountId } = await seed();
    const persistence = new RelayPersistence();
    const job = buildJob(submissionId, accountId);
    await persistence.create(job);
    job.status = NodeStatus.RUNNING;
    await persistence.save(job);

    const active = await persistence.loadActive();
    expect(active.map((j) => j.submissionId)).toContain(submissionId);
  });
});
