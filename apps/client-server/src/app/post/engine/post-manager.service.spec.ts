import {
    NodeStatus,
    PostRecordResumeMode,
    SubmissionType,
    UnitKind,
} from '@postybirb/types';
import { AttemptChainError, resolveAttemptChain } from './attempt-chain';
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
  const dispatchMessage = jest
    .fn()
    .mockResolvedValue({ sourceUrl: 'https://m/1' });
  const deps = {
    rateLimiter: new RateLimiter(new MemoryRateStore()),
    tracer: new RelayTracer(),
    prepare: jest.fn().mockResolvedValue(submission),
    release: jest.fn(),
    getSubmission: jest.fn().mockReturnValue(submission),
    getWebsite: jest.fn().mockReturnValue(website),
    authenticate: jest.fn().mockResolvedValue(undefined),
    buildPostData: jest
      .fn()
      .mockResolvedValue({ postData: {}, sourceUrls: [] }),
    validate: jest.fn().mockResolvedValue([]),
    processBatch: jest.fn().mockResolvedValue([]),
    dispatchFile: jest.fn(),
    dispatchMessage,
  };
  return deps as unknown as RelayPipelineDeps & { dispatchMessage: jest.Mock };
}

function makePersistence(
  over: Partial<RelayPersistence> = {},
): RelayPersistence {
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
  });
  task.status = NodeStatus.SUCCEEDED;
  const unit = new RelayUnit({
    id: `${jobId}:u`,
    taskId: task.id,
    kind: UnitKind.MESSAGE,
    ordinal: 0,
  });
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
    expect(persistence.failJob).toHaveBeenCalledWith(
      'job-bad',
      'submission gone',
    );
    // ...and a fresh, distinct job was created for the submission.
    expect(persistence.create).toHaveBeenCalled();
    expect(jobId).toBeDefined();
    expect(jobId).not.toBe('job-bad');
  });

  it('does not replace an orphan that cannot be marked failed', async () => {
    const submissionId = 'sub-still-active';
    const orphan = succeededOrphan(submissionId, 'job-still-active');
    const deps = makeDeps(submissionId);
    (deps.prepare as jest.Mock).mockRejectedValue(new Error('submission gone'));
    const persistence = makePersistence({
      loadBySubmission: jest.fn().mockResolvedValue([orphan]),
      failJob: jest.fn().mockRejectedValue(new Error('db locked')),
    } as Partial<RelayPersistence>);

    const manager = new RelayPostManager(
      deps,
      persistence,
      makeRegistry(true),
      { archive: jest.fn().mockResolvedValue(undefined) } as never,
      { create: jest.fn().mockResolvedValue(undefined) } as never,
    );

    await expect(manager.enqueue(submissionId)).rejects.toThrow('db locked');
    expect(persistence.create).not.toHaveBeenCalled();
  });

  it('evicts the finished job tree from the scheduler on completion (memory)', async () => {
    // Regression: terminal jobs must not be retained in the scheduler's live
    // working set forever. After completion the job is dropped (served from
    // the DB), so isPosting() is false and history still resolves.
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

  it('only reconciles the newest attempt, never an older stranded one', async () => {
    // An older non-terminal row sitting behind a newer terminal one is dead
    // history; adopting it would re-run an attempt the user already superseded.
    const submissionId = 'sub-stale';
    const stranded = succeededOrphan(submissionId, 'job-stranded');
    const newest = succeededOrphan(submissionId, 'job-newest');
    newest.status = NodeStatus.FAILED;
    const deps = makeDeps(submissionId);
    const persistence = makePersistence({
      // loadBySubmission returns newest-first.
      loadBySubmission: jest.fn().mockResolvedValue([newest, stranded]),
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

    expect(jobId).not.toBe('job-stranded');
    expect(deps.prepare).not.toHaveBeenCalledWith(stranded);
    // A resume of the newest failed attempt is a new row linked back to it.
    const [created] = (persistence.create as jest.Mock).mock.calls[0];
    expect(created.id).toBe(jobId);
    expect(created.attemptOf).toBe('job-newest');
  });

  it('continues from the newest successful attempt by default', async () => {
    const submissionId = 'sub-done';
    const previous = succeededOrphan(submissionId, 'job-done');
    previous.status = NodeStatus.SUCCEEDED;
    const deps = makeDeps(submissionId);
    const persistence = makePersistence({
      loadBySubmission: jest.fn().mockResolvedValue([previous]),
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

    expect(jobId).not.toBe('job-done');
    const [created] = (persistence.create as jest.Mock).mock.calls[0];
    expect(created.attemptOf).toBe('job-done');
    expect(deps.dispatchMessage).not.toHaveBeenCalled();
  });

  it('starts clean after success when NEW is requested', async () => {
    const submissionId = 'sub-new';
    const previous = succeededOrphan(submissionId, 'job-done');
    previous.status = NodeStatus.SUCCEEDED;
    const deps = makeDeps(submissionId);
    const persistence = makePersistence({
      loadBySubmission: jest.fn().mockResolvedValue([previous]),
    } as Partial<RelayPersistence>);
    const manager = new RelayPostManager(
      deps,
      persistence,
      makeRegistry(true),
      { archive: jest.fn().mockResolvedValue(undefined) } as never,
      { create: jest.fn().mockResolvedValue(undefined) } as never,
    );

    await manager.enqueue(submissionId, PostRecordResumeMode.NEW);
    await flush();

    const [created] = (persistence.create as jest.Mock).mock.calls[0];
    expect(created.attemptOf).toBeUndefined();
    expect(deps.dispatchMessage).toHaveBeenCalledTimes(1);
  });

  it('rejects malformed lineage before creating a job', async () => {
    const submissionId = 'sub-malformed';
    const newest = succeededOrphan(submissionId, 'job-newest');
    newest.status = NodeStatus.FAILED;
    newest.attemptOf = 'job-missing';
    const deps = makeDeps(submissionId);
    const persistence = makePersistence({
      loadBySubmission: jest.fn().mockResolvedValue([newest]),
    } as Partial<RelayPersistence>);
    const notifications = {
      create: jest.fn().mockResolvedValue(undefined),
    };
    const manager = new RelayPostManager(
      deps,
      persistence,
      makeRegistry(true),
      { archive: jest.fn().mockResolvedValue(undefined) } as never,
      notifications as never,
    );

    await expect(manager.enqueue(submissionId)).rejects.toBeInstanceOf(
      AttemptChainError,
    );
    expect(persistence.create).not.toHaveBeenCalled();
    expect(deps.prepare).not.toHaveBeenCalled();
    expect(notifications.create).toHaveBeenCalledTimes(1);
  });

  it('refuses to post when the previous attempt cannot be read', async () => {
    // Fail closed: without history a resume cannot tell what already went out,
    // and posting blind would duplicate it. The queue record survives the
    // throw, so a later cycle retries.
    const submissionId = 'sub-unreadable';
    const deps = makeDeps(submissionId);
    const persistence = makePersistence({
      loadBySubmission: jest.fn().mockRejectedValue(new Error('db locked')),
    } as Partial<RelayPersistence>);

    const manager = new RelayPostManager(
      deps,
      persistence,
      makeRegistry(true),
      { archive: jest.fn().mockResolvedValue(undefined) } as never,
      { create: jest.fn().mockResolvedValue(undefined) } as never,
    );

    await expect(manager.enqueue(submissionId)).rejects.toThrow('db locked');
    expect(persistence.create).not.toHaveBeenCalled();
    expect(deps.dispatchMessage).not.toHaveBeenCalled();
  });
});

describe('resolveAttemptChain', () => {
  function job(id: string, attemptOf?: string): RelayJob {
    return new RelayJob({ id, submissionId: 'sub', attemptOf });
  }

  it('follows ids newest-to-oldest without using row adjacency', () => {
    const origin = job('origin');
    const middle = job('middle', origin.id);
    const newest = job('newest', middle.id);
    const unrelated = job('unrelated');

    expect(
      resolveAttemptChain(newest, [newest, unrelated, origin, middle]).map(
        (attempt) => attempt.id,
      ),
    ).toEqual(['newest', 'middle', 'origin']);
  });

  it('stops at an explicit null boundary', () => {
    const newest = job('newest');
    expect(resolveAttemptChain(newest, [newest])).toEqual([newest]);
  });

  it('rejects a missing parent', () => {
    const newest = job('newest', 'missing');
    expect(() => resolveAttemptChain(newest, [newest])).toThrow(
      AttemptChainError,
    );
  });

  it('rejects a cycle', () => {
    const first = job('first', 'second');
    const second = job('second', 'first');
    expect(() => resolveAttemptChain(first, [first, second])).toThrow(
      AttemptChainError,
    );
  });
});
