import { NodeStatus, PostRecordResumeMode, SubmissionType, UnitKind } from '@postybirb/types';
import { RelayJob, RelayTask, RelayUnit } from './model';
import { RelayPersistence } from './persistence';
import { RelayPipelineDeps } from './pipeline-deps';
import { RelayPostManager } from './post-manager.service';
import { MemoryRateStore, RateLimiter } from './rate-limiter';
import { RelayTracer } from './tracer.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Flush pending microtasks/timers so a fire-and-forget drain() can settle. */
async function flush(times = 5): Promise<void> {
  for (let i = 0; i < times; i++) {
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setImmediate(r));
  }
}

function messageSubmission(id = 's1') {
  return {
    id,
    type: SubmissionType.MESSAGE,
    title: 'Test',
    files: [],
    options: [{ accountId: 'a1', websiteId: 'mastodon' }],
  };
}

function messageWebsite() {
  return {
    id: 'mastodon',
    displayName: 'Mastodon',
    supportsFile: false,
    supportsMessage: true,
    minimumPostWaitInterval: 0,
    rateLimitScope: 'account' as const,
    fileBatchSize: 1,
    acceptsExternalSourceUrls: false,
    sourceDependencyMode: 'all' as const,
  };
}

/** A minimal PipelineDeps that posts a message task successfully. */
function makeDeps(submissionId: string) {
  const submission = messageSubmission(submissionId);
  const website = messageWebsite();
  const dispatchMessage = jest.fn().mockResolvedValue({ sourceUrl: 'https://m/1' });
  const deps = {
    rateLimiter: new RateLimiter(new MemoryRateStore()),
    tracer: new RelayTracer(),
    prepare: jest.fn().mockResolvedValue(submission),
    release: jest.fn(),
    getSubmission: jest.fn().mockReturnValue(submission),
    getWebsite: jest.fn().mockReturnValue(website),
    authenticate: jest.fn().mockResolvedValue(undefined),
    buildPostData: jest.fn().mockResolvedValue({ postData: {}, sourceUrls: [] }),
    validate: jest.fn().mockResolvedValue([]),
    processBatch: jest.fn().mockResolvedValue([]),
    dispatchFile: jest.fn(),
    dispatchMessage,
  };
  return deps as unknown as RelayPipelineDeps & { dispatchMessage: jest.Mock };
}

function makePersistence(over: Partial<RelayPersistence> = {}): RelayPersistence {
  return {
    create: jest.fn().mockResolvedValue(undefined),
    save: jest.fn().mockResolvedValue(undefined),
    saveTask: jest.fn().mockResolvedValue(undefined),
    loadActive: jest.fn().mockResolvedValue([]),
    loadBySubmission: jest.fn().mockResolvedValue([]),
    failJob: jest.fn().mockResolvedValue(undefined),
    cancelNonTerminalForSubmission: jest.fn().mockResolvedValue(0),
    ...over,
  } as unknown as RelayPersistence;
}

function makeRegistry(ready = true) {
  return {
    waitForInitialization: ready
      ? jest.fn().mockResolvedValue(undefined)
      : jest.fn().mockRejectedValue(new Error('not ready')),
    findInstance: jest.fn(),
  } as never;
}

/** Build an already-completed (terminal SUCCEEDED) orphan job tree on "disk". */
function succeededOrphan(submissionId: string, jobId: string): RelayJob {
  const job = new RelayJob({ id: jobId, submissionId });
  job.status = NodeStatus.RUNNING; // non-terminal on disk (interrupted)
  const task = new RelayTask({
    id: `${jobId}:t`,
    jobId,
    accountId: 'a1',
    websiteId: 'mastodon',
    idempotencyKey: `${jobId}:k`,
  });
  task.status = NodeStatus.SUCCEEDED;
  const unit = new RelayUnit({ id: `${jobId}:u`, taskId: task.id, kind: UnitKind.MESSAGE, ordinal: 0 });
  unit.status = NodeStatus.SUCCEEDED;
  task.units = [unit];
  job.tasks = [task];
  return job;
}

describe('RelayPostManager hardening', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('adopts an orphaned non-terminal job on enqueue instead of creating a duplicate', async () => {
    // Regression (#3): a non-terminal job left on disk (e.g. crash recovery
    // could not bring the registry up) must be adopted/resumed on the next
    // enqueue rather than spawning a second post_job row.
    const submissionId = 'sub-orphan';
    const orphan = succeededOrphan(submissionId, 'job-orphan');
    const deps = makeDeps(submissionId);
    const persistence = makePersistence({
      loadBySubmission: jest.fn().mockResolvedValue([orphan]),
    } as Partial<RelayPersistence>);

    const manager = new RelayPostManager(
      deps,
      persistence,
      makeRegistry(true),
      { archive: jest.fn().mockResolvedValue(undefined) } as never,
      { create: jest.fn().mockResolvedValue(undefined) } as never,
    );

    const jobId = await manager.enqueue(submissionId);
    await flush();

    expect(jobId).toBe('job-orphan');
    // No duplicate job row was created.
    expect(persistence.create).not.toHaveBeenCalled();
    // The orphan was prepared (context reloaded) and adopted.
    expect(deps.prepare).toHaveBeenCalledWith(orphan);
  });

  it('force-fails an un-adoptable orphan then creates a fresh job', async () => {
    // Regression (#3): if the orphan can't be brought back (prepare throws),
    // mark it FAILED so it leaves the active set and can't wedge the queue,
    // then fall through to create a fresh job for the submission.
    const submissionId = 'sub-bad';
    const orphan = succeededOrphan(submissionId, 'job-bad');
    const deps = makeDeps(submissionId);
    // Reject only the orphan-adoption prepare; the fresh job prepares fine.
    (deps.prepare as jest.Mock)
      .mockRejectedValueOnce(new Error('submission gone'))
      .mockResolvedValue(messageSubmission(submissionId));
    const persistence = makePersistence({
      loadBySubmission: jest.fn().mockResolvedValue([orphan]),
    } as Partial<RelayPersistence>);

    const manager = new RelayPostManager(
      deps,
      persistence,
      makeRegistry(true),
      { archive: jest.fn().mockResolvedValue(undefined) } as never,
      { create: jest.fn().mockResolvedValue(undefined) } as never,
    );

    const jobId = await manager.enqueue(submissionId);
    await flush();

    // The orphan was force-failed...
    expect(persistence.failJob).toHaveBeenCalledWith('job-bad', 'submission gone');
    // ...and a fresh, distinct job was created for the submission.
    expect(persistence.create).toHaveBeenCalled();
    expect(jobId).toBeDefined();
    expect(jobId).not.toBe('job-bad');
  });

  it('defers a future-scheduled job and runs it when the timer fires', async () => {
    // Regression (#5): a scheduledFor in the future must still run even with
    // no other queue activity, via an armed one-shot timer.
    // Keep setImmediate real so flush() still works under fake timers.
    jest.useFakeTimers({ doNotFake: ['setImmediate', 'nextTick'] });
    const submissionId = 'sub-sched';
    const deps = makeDeps(submissionId);
    const persistence = makePersistence();
    const manager = new RelayPostManager(
      deps,
      persistence,
      makeRegistry(true),
      { archive: jest.fn().mockResolvedValue(undefined) } as never,
      { create: jest.fn().mockResolvedValue(undefined) } as never,
    );

    const scheduledFor = Date.now() + 60_000;
    const jobId = await manager.enqueue(submissionId, PostRecordResumeMode.NEW, {
      scheduledFor,
    });
    await Promise.resolve();

    // Created + persisted, but not yet dispatched (its time has not arrived).
    expect(persistence.create).toHaveBeenCalled();
    expect(deps.dispatchMessage).not.toHaveBeenCalled();
    expect(manager.isPosting(submissionId)).toBe(true);

    // Advance past the scheduled time; the armed timer re-drives the run.
    await jest.advanceTimersByTimeAsync(60_001);
    await flush();

    expect(deps.dispatchMessage).toHaveBeenCalledTimes(1);
    expect(manager.getOutcome(submissionId)).toBe(NodeStatus.SUCCEEDED);
    expect(jobId).toBeDefined();
  });

  it('evicts the finished job tree from the scheduler on completion (memory)', async () => {
    // Regression: terminal jobs must not be retained in the scheduler's live
    // working set forever. After completion the job is dropped (served from
    // the bounded recent cache / DB), so isPosting() is false and history
    // still resolves.
    const submissionId = 'sub-evict';
    const deps = makeDeps(submissionId);
    const persistence = makePersistence();
    const manager = new RelayPostManager(
      deps,
      persistence,
      makeRegistry(true),
      { archive: jest.fn().mockResolvedValue(undefined) } as never,
      { create: jest.fn().mockResolvedValue(undefined) } as never,
    );

    const jobId = await manager.enqueue(submissionId);
    await flush();

    expect(deps.dispatchMessage).toHaveBeenCalledTimes(1);
    // The submission is no longer tracked as active/posting once terminal.
    expect(manager.isPosting(submissionId)).toBe(false);
    // The live active-tree snapshot no longer includes the finished job.
    expect(manager.getActiveTrees()).toHaveLength(0);
    // The per-job context was released.
    expect(deps.release).toHaveBeenCalledWith(jobId);
  });
});
