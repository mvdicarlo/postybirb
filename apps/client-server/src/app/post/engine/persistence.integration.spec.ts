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

  it('loadBySubmission returns all jobs incl. terminal ones', async () => {
    const { submissionId, accountId } = await seed();
    const persistence = new RelayPersistence();
    const job = buildJob(submissionId, accountId);
    await persistence.create(job);
    job.status = NodeStatus.SUCCEEDED;
    job.completedAt = Date.now();
    await persistence.save(job);

    // Not active anymore...
    expect(await persistence.loadActive()).toHaveLength(0);
    // ...but still present in history.
    const history = await persistence.loadBySubmission(submissionId);
    expect(history).toHaveLength(1);
    expect(history[0].status).toBe(NodeStatus.SUCCEEDED);
    expect(history[0].submissionId).toBe(submissionId);
  });

  it('cancelNonTerminalForSubmission clears stuck rows even when no live job exists', async () => {
    // Simulates a crash recovery that silently dropped a job: the DB row is
    // still non-terminal but nothing is registered in memory. The user must
    // still be able to clear the stuck record via the cancel UI.
    const { submissionId, accountId } = await seed();
    const persistence = new RelayPersistence();
    const job = buildJob(submissionId, accountId);
    await persistence.create(job);

    // Pretend the scheduler had it RUNNING when the app crashed.
    job.status = NodeStatus.RUNNING;
    job.tasks[0].status = NodeStatus.WAITING;
    job.tasks[0].waitingUntil = Date.now() + 5 * 60_000;
    await persistence.save(job);

    const cleared = await persistence.cancelNonTerminalForSubmission(
      submissionId,
    );
    expect(cleared).toBe(1);

    expect(await persistence.loadActive()).toHaveLength(0);

    const history = await persistence.loadBySubmission(submissionId);
    expect(history).toHaveLength(1);
    expect(history[0].status).toBe(NodeStatus.CANCELLED);
    expect(history[0].tasks[0].status).toBe(NodeStatus.CANCELLED);
    expect(history[0].tasks[0].units[0].status).toBe(NodeStatus.CANCELLED);
    expect(history[0].tasks[0].waitingUntil).toBeUndefined();
  });

  it('cancelNonTerminalForSubmission leaves already-terminal jobs alone', async () => {
    const { submissionId, accountId } = await seed();
    const persistence = new RelayPersistence();
    const job = buildJob(submissionId, accountId);
    await persistence.create(job);
    job.status = NodeStatus.SUCCEEDED;
    job.completedAt = Date.now();
    job.tasks[0].status = NodeStatus.SUCCEEDED;
    await persistence.save(job);

    const cleared = await persistence.cancelNonTerminalForSubmission(
      submissionId,
    );
    expect(cleared).toBe(0);

    const history = await persistence.loadBySubmission(submissionId);
    expect(history[0].status).toBe(NodeStatus.SUCCEEDED);
  });

  it('failJob force-marks an unrecoverable job FAILED', async () => {
    const { submissionId, accountId } = await seed();
    const persistence = new RelayPersistence();
    const job = buildJob(submissionId, accountId);
    await persistence.create(job);

    await persistence.failJob(job.id, 'submission deleted');

    expect(await persistence.loadActive()).toHaveLength(0);
    const history = await persistence.loadBySubmission(submissionId);
    expect(history[0].status).toBe(NodeStatus.FAILED);
    expect(history[0].tasks[0].status).toBe(NodeStatus.FAILED);
    expect(history[0].tasks[0].error?.message).toBe('submission deleted');
  });
});
