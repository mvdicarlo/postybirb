import {
    NodeStatus,
    PostErrorKind,
    PostRecordResumeMode,
    SubmissionType,
} from '@postybirb/types';
import { CancellableToken } from '../models/cancellable-token';
import { PostingFile } from '../models/posting-file';
import { StageError } from './errors';
import { RelayTask } from './model';
import {
    PipelineDeps,
    RelayDispatchData,
    RelaySubmission,
    resetForResume,
    seedFromPreviousAttempts,
} from './pipeline';
import { MemoryRateStore, RateLimiter } from './rate-limiter';
import { RelayScheduler } from './scheduler';
import { RelayTracer } from './tracer.service';
import { RelayPostResult, RelayWebsite } from './websites';

// ---------------------------------------------------------------------------
// Mock websites + harness
// ---------------------------------------------------------------------------

function fileWebsite(over: Partial<RelayWebsite> = {}): RelayWebsite {
  return {
    id: over.id ?? 'site',
    displayName: over.displayName ?? over.id ?? 'site',
    supportsFile: over.supportsFile ?? true,
    supportsMessage: over.supportsMessage ?? false,
    minimumPostWaitInterval: over.minimumPostWaitInterval ?? 0,
    rateLimitScope: over.rateLimitScope ?? 'account',
    fileBatchSize: over.fileBatchSize ?? 1,
    acceptsExternalSourceUrls: over.acceptsExternalSourceUrls ?? false,
    sourceDependencyMode: over.sourceDependencyMode ?? 'all',
  };
}

type DispatchBehavior = (
  website: RelayWebsite,
  data: RelayDispatchData,
  batchIndex: number,
  attempt: number,
) => RelayPostResult;

class Harness implements PipelineDeps {
  rateLimiter = new RateLimiter(new MemoryRateStore());

  tracer = new RelayTracer();

  private readonly websites = new Map<string, RelayWebsite>();

  private readonly attemptByTask = new Map<string, number>();

  behavior: DispatchBehavior = (w, _d, batchIndex) => ({
    sourceUrl: `https://${w.id}/${batchIndex}-${Math.random().toString(36).slice(2)}`,
  });

  constructor(private readonly submission: RelaySubmission) {}

  /** Account ids that should fail authentication. */
  readonly authFailures = new Set<string>();

  register(site: RelayWebsite): void {
    this.websites.set(site.id, site);
  }

  async authenticate(task: RelayTask): Promise<void> {
    if (this.authFailures.has(task.accountId)) {
      throw new Error(`Not logged in to ${task.websiteId}`);
    }
  }

  getWebsite(_jobId: string, websiteId: string): RelayWebsite {
    const site = this.websites.get(websiteId);
    if (!site) throw new Error(`no mock website ${websiteId}`);
    return site;
  }

  getSubmission(): RelaySubmission {
    return this.submission;
  }

  async buildPostData(
    task: RelayTask,
    upstreamSourceUrls: string[],
  ): Promise<RelayDispatchData> {
    return {
      postData: { title: this.submission.title },
      sourceUrls: upstreamSourceUrls,
    };
  }

  async validate(): Promise<string[]> {
    return [];
  }

  async processBatch(
    _task: RelayTask,
    fileIds: string[],
  ): Promise<PostingFile[]> {
    // Mock: produce a posting file per id without real bytes.
    return fileIds.map(
      (id) =>
        ({
          id,
          fileName: `${id}.jpg`,
          mimeType: 'image/jpeg',
        }) as unknown as PostingFile,
    );
  }

  async dispatchFile(
    website: RelayWebsite,
    data: RelayDispatchData,
    files: PostingFile[],
    _token: CancellableToken,
    batch: { index: number; totalBatches: number },
  ): Promise<RelayPostResult> {
    const key = `${website.id}`;
    const attempt = (this.attemptByTask.get(key) ?? 0) + 1;
    this.attemptByTask.set(key, attempt);
    return this.behavior(website, data, batch.index, attempt);
  }

  async dispatchMessage(
    website: RelayWebsite,
    data: RelayDispatchData,
  ): Promise<RelayPostResult> {
    return this.behavior(website, data, 0, 1);
  }
}

function fileSubmission(): RelaySubmission {
  return {
    id: 's1',
    type: SubmissionType.FILE,
    title: 'Test',
    files: [
      {
        id: 'f1',
        fileName: 'f1.jpg',
        mimeType: 'image/jpeg',
        width: 1200,
        height: 1200,
        bytes: 500_000,
        hash: 'h1',
        order: 0,
      },
      {
        id: 'f2',
        fileName: 'f2.jpg',
        mimeType: 'image/jpeg',
        width: 1200,
        height: 1200,
        bytes: 500_000,
        hash: 'h2',
        order: 1,
      },
      {
        id: 'f3',
        fileName: 'f3.jpg',
        mimeType: 'image/jpeg',
        width: 1200,
        height: 1200,
        bytes: 500_000,
        hash: 'h3',
        order: 2,
      },
    ],
    options: [
      { accountId: 'a_fa', websiteId: 'furaffinity' },
      { accountId: 'a_ws', websiteId: 'weasyl' },
      { accountId: 'a_bs', websiteId: 'bluesky' },
    ],
  };
}

const instant = { wait: () => Promise.resolve() };

describe('Relay pipeline + scheduler (integration)', () => {
  it('batches files, posts all tasks, and propagates source URLs to external-source sites', async () => {
    const submission = fileSubmission();
    const h = new Harness(submission);
    h.register(fileWebsite({ id: 'furaffinity', fileBatchSize: 1 }));
    h.register(fileWebsite({ id: 'weasyl', fileBatchSize: 3 }));
    h.register(
      fileWebsite({
        id: 'bluesky',
        fileBatchSize: 4,
        acceptsExternalSourceUrls: true,
      }),
    );

    const sched = new RelayScheduler(h, {
      ...instant,
      maxConcurrentJobs: 2,
      maxConcurrentTasks: 4,
    });
    const job = sched.enqueue(submission.id);

    const fa = job.tasks.find((t) => t.websiteId === 'furaffinity')!;
    const ws = job.tasks.find((t) => t.websiteId === 'weasyl')!;
    const bs = job.tasks.find((t) => t.websiteId === 'bluesky')!;
    expect(fa.units).toHaveLength(3); // batch size 1
    expect(ws.units).toHaveLength(1); // batch size 3
    expect(bs.dependency?.mode).toBe('all');
    expect(bs.dependency?.tasks).toHaveLength(2);

    await sched.runToIdle();

    expect(job.status).toBe(NodeStatus.SUCCEEDED);
    expect(fa.status).toBe(NodeStatus.SUCCEEDED);

    const parseEntry = h.tracer
      .getEntries(job.id)
      .find((e) => e.taskId === bs.id && e.stage === 'parse');
    expect((parseEntry?.data?.upstreamSourceUrls as string[]).length).toBe(2);
  });

  it('retries a transient failure then succeeds', async () => {
    const submission = fileSubmission();
    submission.options = [{ accountId: 'a_fk', websiteId: 'flaky' }];
    const h = new Harness(submission);
    h.register(fileWebsite({ id: 'flaky', fileBatchSize: 3 }));
    h.behavior = (w, _d, batchIndex, attempt) => {
      if (attempt === 1) {
        throw new StageError({
          kind: PostErrorKind.TRANSIENT,
          stage: 'dispatch',
          message: '503',
        });
      }
      return { sourceUrl: `https://flaky/${batchIndex}` };
    };

    const sched = new RelayScheduler(h, instant);
    const job = sched.enqueue(submission.id);
    await sched.runToIdle();

    expect(job.status).toBe(NodeStatus.SUCCEEDED);
    expect(job.tasks[0].attempts).toBe(1);
  });

  it('fails a task whose account cannot authenticate, without dispatching', async () => {
    const submission = fileSubmission();
    submission.options = [{ accountId: 'a_fa', websiteId: 'furaffinity' }];
    const h = new Harness(submission);
    h.register(fileWebsite({ id: 'furaffinity', fileBatchSize: 1 }));
    h.authFailures.add('a_fa');
    let dispatched = 0;
    h.behavior = () => {
      dispatched += 1;
      return { sourceUrl: 'https://furaffinity/0' };
    };

    const sched = new RelayScheduler(h, instant);
    const job = sched.enqueue(submission.id);
    await sched.runToIdle();

    expect(dispatched).toBe(0);
    expect(job.tasks[0].status).toBe(NodeStatus.FAILED);
    expect(job.status).toBe(NodeStatus.FAILED);
  });

  it('parks on a rate limit then resumes without re-posting completed units', async () => {
    const submission = fileSubmission();
    submission.options = [{ accountId: 'a_fa', websiteId: 'furaffinity' }];
    const h = new Harness(submission);
    h.register(
      fileWebsite({
        id: 'furaffinity',
        fileBatchSize: 1,
        minimumPostWaitInterval: 50,
      }),
    );

    const sched = new RelayScheduler(h, { ...instant });
    const job = sched.enqueue(submission.id);
    await sched.runToIdle();

    expect(job.status).toBe(NodeStatus.SUCCEEDED);
    const fa = job.tasks[0];
    expect(fa.units.every((u) => u.status === NodeStatus.SUCCEEDED)).toBe(true);
    // 3 batches each got a unique source URL (no re-post duplication beyond batches)
    const urls = new Set(fa.units.map((u) => u.sourceUrl));
    expect(urls.size).toBe(3);
  });

  it('cancels a job parked on a long rate-limit wait without waiting it out', async () => {
    const submission = fileSubmission();
    submission.options = [{ accountId: 'a_fa', websiteId: 'furaffinity' }];
    const h = new Harness(submission);
    // 3 batches; first posts immediately, the rest park for ~5 minutes.
    h.register(
      fileWebsite({
        id: 'furaffinity',
        fileBatchSize: 1,
        minimumPostWaitInterval: 300_000,
      }),
    );

    // A wait that never resolves on its own: the only way out of the parked
    // sleep is the cancellation signal racing inside interruptibleWait.
    const neverWait = () => new Promise<void>(() => undefined);
    const sched = new RelayScheduler(h, { wait: neverWait });
    const job = sched.enqueue(submission.id);

    const run = sched.runToIdle();
    // Let the first batch post and the task park in WAITING.
    await new Promise((r) => {
      setTimeout(r, 10);
    });
    expect(job.tasks[0].status).toBe(NodeStatus.WAITING);

    sched.cancel(job.id);
    await run; // resolves promptly rather than hanging on the 5-minute wait

    expect(job.status).toBe(NodeStatus.CANCELLED);
    expect(job.tasks[0].status).toBe(NodeStatus.CANCELLED);
    // The first batch had already posted before the cancel landed.
    expect(job.tasks[0].units[0].status).toBe(NodeStatus.SUCCEEDED);
    // Remaining batches are cancelled, not left dangling.
    expect(
      job.tasks[0].units
        .slice(1)
        .every((u) => u.status === NodeStatus.CANCELLED),
    ).toBe(true);
  });

  it('resume (CONTINUE) re-runs only non-done units', async () => {
    const submission = fileSubmission();
    submission.options = [{ accountId: 'a_dt', websiteId: 'downthenup' }];
    const h = new Harness(submission);
    h.register(fileWebsite({ id: 'downthenup', fileBatchSize: 2 }));

    let recovered = false;
    h.behavior = (w, _d, batchIndex) => {
      if (!recovered && batchIndex > 0) {
        throw new StageError({
          kind: PostErrorKind.TRANSIENT,
          stage: 'dispatch',
          message: 'down',
        });
      }
      return { sourceUrl: `https://dtu/${batchIndex}-${Math.random()}` };
    };

    const sched = new RelayScheduler(h, instant);
    const job = sched.enqueue(submission.id);
    await sched.runToIdle();

    expect(job.status).toBe(NodeStatus.FAILED);
    const dtu = job.tasks[0];
    expect(dtu.units[0].status).toBe(NodeStatus.SUCCEEDED);
    expect(dtu.units[1].status).toBe(NodeStatus.FAILED);
    const batch1Url = dtu.units[0].sourceUrl;

    recovered = true;
    sched.resume(job.id, PostRecordResumeMode.CONTINUE);
    await sched.runToIdle();

    expect(job.status).toBe(NodeStatus.SUCCEEDED);
    expect(dtu.units[0].sourceUrl).toBe(batch1Url); // batch 1 not re-posted
    expect(dtu.units[1].status).toBe(NodeStatus.SUCCEEDED);
  });

  it('skips a message-only site for a FILE submission', async () => {
    const submission = fileSubmission();
    submission.options = [{ accountId: 'a_md', websiteId: 'mastodon' }];
    const h = new Harness(submission);
    h.register(
      fileWebsite({
        id: 'mastodon',
        supportsFile: false,
        supportsMessage: true,
      } as Partial<RelayWebsite>),
    );
    // override supportsFile false
    const sched = new RelayScheduler(h, instant);
    const job = sched.enqueue(submission.id);
    expect(job.tasks[0].status).toBe(NodeStatus.SKIPPED);
    await sched.runToIdle();
    expect(job.status).toBe(NodeStatus.SUCCEEDED);
  });

  it('keeps a posted unit SUCCEEDED when the success-persist fails (no double-post)', async () => {
    // Regression: a DB write failure after a unit has already posted must NOT
    // flip the unit back to a re-postable state, or resume would double-post.
    const submission = fileSubmission();
    submission.options = [{ accountId: 'a_fa', websiteId: 'furaffinity' }];
    const h = new Harness(submission);
    h.register(fileWebsite({ id: 'furaffinity', fileBatchSize: 3 }));

    let dispatches = 0;
    h.behavior = (w, _d, batchIndex) => {
      dispatches += 1;
      return { sourceUrl: `https://furaffinity/${batchIndex}` };
    };

    const persistErr = new Error('SQLITE_BUSY: database is locked');
    const onTaskChanged = jest.fn().mockRejectedValue(persistErr);
    const sched = new RelayScheduler(h, {
      ...instant,
      onTaskChanged,
    });
    const job = sched.enqueue(submission.id);
    await sched.runToIdle();

    const fa = job.tasks[0];
    // The post went out and the in-memory state stays SUCCEEDED despite the
    // persist failure — it is NOT downgraded to FAILED/QUEUED.
    expect(fa.status).toBe(NodeStatus.SUCCEEDED);
    expect(fa.units.every((u) => u.status === NodeStatus.SUCCEEDED)).toBe(true);
    expect(job.status).toBe(NodeStatus.SUCCEEDED);
    // Persist was attempted (and retried) but the dispatch ran exactly once.
    expect(dispatches).toBe(1);
    expect(onTaskChanged).toHaveBeenCalled();
    // The durable-persist failure is logged loudly for diagnosis.
    const persistFailed = h.tracer
      .getEntries(job.id)
      .find((e) => e.event === 'task.persist_failed');
    expect(persistFailed).toBeTruthy();
  });

  it('retries a network/IO blip during authenticate (transient outside dispatch)', async () => {
    // Regression: transient errors in non-dispatch stages (auth/parse/etc.)
    // must retry rather than failing the task terminally.
    const submission = fileSubmission();
    submission.options = [{ accountId: 'a_fa', websiteId: 'furaffinity' }];
    const h = new Harness(submission);
    h.register(fileWebsite({ id: 'furaffinity', fileBatchSize: 3 }));

    let authCalls = 0;
    h.authenticate = async () => {
      authCalls += 1;
      if (authCalls === 1) {
        throw Object.assign(new Error('socket hang up'), {
          code: 'ECONNRESET',
        });
      }
    };

    const sched = new RelayScheduler(h, instant);
    const job = sched.enqueue(submission.id);
    await sched.runToIdle();

    expect(job.status).toBe(NodeStatus.SUCCEEDED);
    expect(authCalls).toBe(2); // failed once, retried, succeeded
    expect(job.tasks[0].attempts).toBe(1); // the transient retry consumed one
  });

  it('fails terminally when the cumulative rate-limit wait ceiling is exceeded', async () => {
    // Regression: a task on a busy shared bucket must not park forever. A
    // single park whose wait exceeds the ceiling fails the task terminally.
    const submission = fileSubmission();
    submission.options = [{ accountId: 'a_fa', websiteId: 'furaffinity' }];
    const h = new Harness(submission);
    // Interval just over the 1h ceiling: batch 0 posts, batch 1's required
    // wait alone blows the ceiling and fails the task.
    h.register(
      fileWebsite({
        id: 'furaffinity',
        fileBatchSize: 1,
        minimumPostWaitInterval: 60 * 60 * 1000 + 1,
      }),
    );

    const sched = new RelayScheduler(h, instant);
    const job = sched.enqueue(submission.id);
    await sched.runToIdle();

    const fa = job.tasks[0];
    expect(fa.status).toBe(NodeStatus.FAILED);
    expect(fa.units[0].status).toBe(NodeStatus.SUCCEEDED); // first batch posted
    expect(fa.error?.message).toMatch(/ceiling/i);
    expect(job.status).toBe(NodeStatus.FAILED);
  });

  it('forget() evicts a terminal job from the live working set (DB serves it after)', async () => {
    const submission = fileSubmission();
    submission.options = [{ accountId: 'a_fa', websiteId: 'furaffinity' }];
    const h = new Harness(submission);
    h.register(fileWebsite({ id: 'furaffinity', fileBatchSize: 3 }));

    const sched = new RelayScheduler(h, instant);
    const job = sched.enqueue(submission.id);
    await sched.runToIdle();
    expect(job.status).toBe(NodeStatus.SUCCEEDED);

    // Still resolvable while live (before forget).
    expect(sched.getJob(job.id)).toBe(job);
    // forget drops the terminal job from memory; the DB is the source of truth
    // for completed jobs, so it is no longer resolvable from the scheduler.
    sched.forget(job.id);
    expect(sched.getJob(job.id)).toBeUndefined();
  });

  it('forget() ignores a still-running (non-terminal) job', async () => {
    const submission = fileSubmission();
    submission.options = [{ accountId: 'a_fa', websiteId: 'furaffinity' }];
    const h = new Harness(submission);
    h.register(fileWebsite({ id: 'furaffinity', fileBatchSize: 3 }));
    const sched = new RelayScheduler(h, instant);
    const job = sched.enqueue(submission.id); // QUEUED, not terminal
    sched.forget(job.id);
    expect(sched.getJob(job.id)).toBe(job); // retained
  });

  it('any-mode external site posts after the first upstream URL', async () => {
    const submission = fileSubmission();
    submission.options = [
      { accountId: 'a_ws', websiteId: 'weasyl' },
      { accountId: 'a_fa', websiteId: 'furaffinity' },
      { accountId: 'a_cp', websiteId: 'crosspost' },
    ];
    const h = new Harness(submission);
    h.register(fileWebsite({ id: 'weasyl', fileBatchSize: 3 }));
    h.register(fileWebsite({ id: 'furaffinity', fileBatchSize: 3 }));
    h.register(
      fileWebsite({
        id: 'crosspost',
        fileBatchSize: 3,
        acceptsExternalSourceUrls: true,
        sourceDependencyMode: 'any',
      }),
    );

    const sched = new RelayScheduler(h, instant);
    const job = sched.enqueue(submission.id);
    const cp = job.tasks.find((t) => t.websiteId === 'crosspost')!;
    expect(cp.dependency?.mode).toBe('any');

    await sched.runToIdle();
    expect(job.status).toBe(NodeStatus.SUCCEEDED);
    expect(cp.sourceUrl).toBeTruthy();
  });

  it('allSettled external site still posts when an upstream fails (best-effort)', async () => {
    const submission = fileSubmission();
    submission.options = [
      { accountId: 'a_fa', websiteId: 'furaffinity' },
      { accountId: 'a_cp', websiteId: 'crosspost' },
    ];
    const h = new Harness(submission);
    h.register(fileWebsite({ id: 'furaffinity', fileBatchSize: 3 }));
    h.register(
      fileWebsite({
        id: 'crosspost',
        fileBatchSize: 3,
        acceptsExternalSourceUrls: true,
        sourceDependencyMode: 'allSettled',
      }),
    );
    // The only upstream fails to authenticate.
    h.authFailures.add('a_fa');

    const sched = new RelayScheduler(h, instant);
    const job = sched.enqueue(submission.id);
    const fa = job.tasks.find((t) => t.websiteId === 'furaffinity')!;
    const cp = job.tasks.find((t) => t.websiteId === 'crosspost')!;
    expect(cp.dependency?.mode).toBe('allSettled');

    await sched.runToIdle();

    // The upstream failed, but the cross-poster still posted (best-effort) — it
    // is NOT skipped the way a strict 'all' gate would skip it.
    expect(fa.status).toBe(NodeStatus.FAILED);
    expect(cp.status).toBe(NodeStatus.SUCCEEDED);
    expect(cp.sourceUrl).toBeTruthy();
    expect(job.status).toBe(NodeStatus.FAILED); // one site failed overall
  });

  it('still wires a source dependency when files already have user source URLs', async () => {
    const submission = fileSubmission();
    // User supplied a source URL on every file.
    submission.files = submission.files.map((f) => ({
      ...f,
      sourceUrls: ['https://user/source'],
    }));
    submission.options = [
      { accountId: 'a_fa', websiteId: 'furaffinity' },
      { accountId: 'a_cp', websiteId: 'crosspost' },
    ];
    const h = new Harness(submission);
    h.register(fileWebsite({ id: 'furaffinity', fileBatchSize: 3 }));
    h.register(
      fileWebsite({
        id: 'crosspost',
        fileBatchSize: 3,
        acceptsExternalSourceUrls: true,
      }),
    );

    const sched = new RelayScheduler(h, instant);
    const job = sched.enqueue(submission.id);
    const cp = job.tasks.find((t) => t.websiteId === 'crosspost')!;
    const fa = job.tasks.find((t) => t.websiteId === 'furaffinity')!;
    // User sources are additive, so the cross-poster still waits for upstream.
    expect(cp.dependency?.tasks).toEqual([fa.id]);

    await sched.runToIdle();
    expect(job.status).toBe(NodeStatus.SUCCEEDED);
  });

  describe('resuming a previous attempt', () => {
    /** weasyl fully posted; furaffinity posted 2 of 3 batches then died. */
    function previousAttempt() {
      const submission = fileSubmission();
      submission.options = [
        { accountId: 'a_fa', websiteId: 'furaffinity' },
        { accountId: 'a_ws', websiteId: 'weasyl' },
      ];
      const h = new Harness(submission);
      h.register(fileWebsite({ id: 'furaffinity', fileBatchSize: 1 }));
      h.register(fileWebsite({ id: 'weasyl', fileBatchSize: 3 }));
      const sched = new RelayScheduler(h, instant);

      const previous = sched.enqueue(submission.id);
      const fa = previous.tasks.find((t) => t.websiteId === 'furaffinity')!;
      fa.units[0].status = NodeStatus.SUCCEEDED;
      fa.units[0].sourceUrl = 'https://furaffinity/1';
      fa.units[1].status = NodeStatus.SUCCEEDED;
      fa.units[1].sourceUrl = 'https://furaffinity/2';
      fa.units[2].status = NodeStatus.FAILED;
      fa.status = NodeStatus.FAILED;
      fa.sourceUrl = 'https://furaffinity/1';
      const ws = previous.tasks.find((t) => t.websiteId === 'weasyl')!;
      ws.units[0].status = NodeStatus.SUCCEEDED;
      ws.units[0].sourceUrl = 'https://weasyl/1';
      ws.status = NodeStatus.SUCCEEDED;
      ws.sourceUrl = 'https://weasyl/1';
      previous.status = NodeStatus.FAILED;

      return { sched, previous, submission, h };
    }

    function tasksOf(job: ReturnType<RelayScheduler['enqueue']>) {
      return {
        fa: job.tasks.find((t) => t.websiteId === 'furaffinity')!,
        ws: job.tasks.find((t) => t.websiteId === 'weasyl')!,
      };
    }

    /** [file id, status] per unit, for a site whose batches hold one file. */
    function unitsByFile(task: RelayTask) {
      return task.units.map((unit) => [unit.fileIds[0], unit.status]);
    }

    it('CONTINUE resumes at the first unposted batch', () => {
      const { sched, previous, submission, h } = previousAttempt();

      const retry = sched.enqueue(submission.id);
      seedFromPreviousAttempts(
        retry,
        [previous],
        PostRecordResumeMode.CONTINUE,
        h,
      );
      resetForResume(retry);

      const { fa, ws } = tasksOf(retry);
      expect(ws.status).toBe(NodeStatus.SUCCEEDED);
      expect(ws.sourceUrl).toBe('https://weasyl/1');
      expect(fa.status).toBe(NodeStatus.QUEUED);
      expect(fa.units.map((u) => u.status)).toEqual([
        NodeStatus.SUCCEEDED,
        NodeStatus.SUCCEEDED,
        NodeStatus.QUEUED,
      ]);
      expect(fa.units[0].sourceUrl).toBe('https://furaffinity/1');
    });

    it('gives a re-queued task a fresh retry budget', () => {
      const { sched, previous, submission, h } = previousAttempt();

      const retry = sched.enqueue(submission.id);
      seedFromPreviousAttempts(
        retry,
        [previous],
        PostRecordResumeMode.CONTINUE,
        h,
      );
      // A crash-adopted job carries the attempts it had already burned.
      tasksOf(retry).fa.attempts = 3;
      resetForResume(retry);

      expect(tasksOf(retry).fa.attempts).toBe(0);
    });

    it('CONTINUE_RETRY re-runs an incomplete site from its first batch', () => {
      const { sched, previous, submission, h } = previousAttempt();

      const retry = sched.enqueue(submission.id);
      seedFromPreviousAttempts(
        retry,
        [previous],
        PostRecordResumeMode.CONTINUE_RETRY,
        h,
      );
      resetForResume(retry);

      // A site that fully posted is never re-sent, whatever the mode.
      const { fa, ws } = tasksOf(retry);
      expect(ws.status).toBe(NodeStatus.SUCCEEDED);
      expect(ws.sourceUrl).toBe('https://weasyl/1');

      expect(fa.status).toBe(NodeStatus.QUEUED);
      expect(fa.units.every((u) => u.status === NodeStatus.QUEUED)).toBe(true);
      // Nothing of this task survives, so no stale URL is left for downstream.
      expect(fa.units.every((u) => u.sourceUrl === undefined)).toBe(true);
      expect(fa.sourceUrl).toBeUndefined();
    });

    it('NEW ignores the previous attempt entirely', () => {
      const { sched, submission } = previousAttempt();

      // NEW never seeds, so the freshly planned tree is what runs.
      const retry = sched.enqueue(submission.id);

      const { fa, ws } = tasksOf(retry);
      expect(retry.attemptOf).toBeUndefined();
      for (const task of [fa, ws]) {
        expect(task.status).toBe(NodeStatus.QUEUED);
        expect(task.sourceUrl).toBeUndefined();
        expect(task.units.every((u) => u.status === NodeStatus.QUEUED)).toBe(
          true,
        );
      }
    });

    it('re-posts a replaced file without re-posting its neighbours', () => {
      const { sched, previous, submission, h } = previousAttempt();
      // f1 posted, then the user swapped it out for a different file.
      submission.files[0] = { ...submission.files[0], id: 'f1-replaced' };

      const retry = sched.enqueue(submission.id);
      seedFromPreviousAttempts(
        retry,
        [previous],
        PostRecordResumeMode.CONTINUE,
        h,
      );
      resetForResume(retry);

      const { fa } = tasksOf(retry);
      expect(unitsByFile(fa)).toEqual([
        // The batch that posted f1 is gone, taking its source URL with it.
        ['f2', NodeStatus.SUCCEEDED],
        ['f1-replaced', NodeStatus.QUEUED],
        ['f3', NodeStatus.QUEUED],
      ]);
    });

    it('posts only the added file when the site already finished', () => {
      const submission = fileSubmission();
      submission.options = [{ accountId: 'a_fa', websiteId: 'furaffinity' }];
      const h = new Harness(submission);
      // Big enough that every file lands in one batch, as most sites do.
      h.register(fileWebsite({ id: 'furaffinity', fileBatchSize: 10 }));
      const sched = new RelayScheduler(h, instant);

      const previous = sched.enqueue(submission.id);
      const previousTask = previous.tasks[0];
      previousTask.units[0].status = NodeStatus.SUCCEEDED;
      previousTask.units[0].sourceUrl = 'https://furaffinity/batch';
      previousTask.status = NodeStatus.SUCCEEDED;
      previous.status = NodeStatus.FAILED;

      submission.files.push({ ...submission.files[0], id: 'f4', order: 4 });
      const retry = sched.enqueue(submission.id);
      seedFromPreviousAttempts(
        retry,
        [previous],
        PostRecordResumeMode.CONTINUE,
        h,
      );
      resetForResume(retry);

      const task = retry.tasks[0];
      expect(task.status).toBe(NodeStatus.QUEUED);
      expect(task.units.map((unit) => [unit.fileIds, unit.status])).toEqual([
        [['f1', 'f2', 'f3'], NodeStatus.SUCCEEDED],
        [['f4'], NodeStatus.QUEUED],
      ]);
      expect(task.sourceUrl).toBeUndefined();
    });

    it('does not re-post earlier files when a new file is ordered first', () => {
      const { sched, previous, submission, h } = previousAttempt();
      submission.files.unshift({ ...submission.files[0], id: 'f0', order: -1 });

      const retry = sched.enqueue(submission.id);
      seedFromPreviousAttempts(
        retry,
        [previous],
        PostRecordResumeMode.CONTINUE,
        h,
      );
      resetForResume(retry);

      const { fa } = tasksOf(retry);
      expect(unitsByFile(fa)).toEqual([
        ['f1', NodeStatus.SUCCEEDED],
        ['f2', NodeStatus.SUCCEEDED],
        ['f0', NodeStatus.QUEUED],
        ['f3', NodeStatus.QUEUED],
      ]);
    });

    it('CONTINUE_RETRY re-posts an added file alongside the incomplete site', () => {
      const { sched, previous, submission, h } = previousAttempt();
      submission.files.push({ ...submission.files[0], id: 'f4', order: 4 });

      const retry = sched.enqueue(submission.id);
      seedFromPreviousAttempts(
        retry,
        [previous],
        PostRecordResumeMode.CONTINUE_RETRY,
        h,
      );
      resetForResume(retry);

      const { fa, ws } = tasksOf(retry);
      expect(unitsByFile(fa)).toEqual([
        ['f1', NodeStatus.QUEUED],
        ['f2', NodeStatus.QUEUED],
        ['f3', NodeStatus.QUEUED],
        ['f4', NodeStatus.QUEUED],
      ]);
      // weasyl finished, so only its added file goes out.
      expect(ws.units.map((unit) => [unit.fileIds, unit.status])).toEqual([
        [['f1', 'f2', 'f3'], NodeStatus.SUCCEEDED],
        [['f4'], NodeStatus.QUEUED],
      ]);
    });

    it('matches a completed batch when its files are reordered', () => {
      const submission = fileSubmission();
      submission.options = [{ accountId: 'a_fa', websiteId: 'furaffinity' }];
      const h = new Harness(submission);
      h.register(fileWebsite({ id: 'furaffinity', fileBatchSize: 3 }));
      const sched = new RelayScheduler(h, instant);
      const previous = sched.enqueue(submission.id);
      const previousTask = previous.tasks[0];
      previousTask.units[0].status = NodeStatus.SUCCEEDED;
      previousTask.units[0].sourceUrl = 'https://furaffinity/batch';
      previousTask.status = NodeStatus.SUCCEEDED;
      previousTask.sourceUrl = 'https://furaffinity/batch';

      submission.files.reverse();
      const retry = sched.enqueue(submission.id);
      seedFromPreviousAttempts(
        retry,
        [previous],
        PostRecordResumeMode.CONTINUE,
        h,
      );
      resetForResume(retry);

      expect(retry.tasks[0].status).toBe(NodeStatus.SUCCEEDED);
      expect(retry.tasks[0].units[0].status).toBe(NodeStatus.SUCCEEDED);
      expect(retry.tasks[0].sourceUrl).toBe('https://furaffinity/batch');
    });

    it('accumulates completed batches through the immediately prior attempt', () => {
      const { sched, previous, submission, h } = previousAttempt();
      const previousFa = tasksOf(previous).fa;
      previousFa.units[1].status = NodeStatus.FAILED;
      previousFa.units[1].sourceUrl = undefined;

      const retryOne = sched.createJob(submission.id, {
        resumeMode: PostRecordResumeMode.CONTINUE,
        attemptOf: previous.id,
      });
      sched.plan(retryOne);
      seedFromPreviousAttempts(
        retryOne,
        [previous],
        PostRecordResumeMode.CONTINUE,
        h,
      );
      resetForResume(retryOne);
      const retryOneFa = tasksOf(retryOne).fa;
      retryOneFa.units[1].status = NodeStatus.SUCCEEDED;
      retryOneFa.units[1].sourceUrl = 'https://furaffinity/2';
      retryOneFa.units[2].status = NodeStatus.FAILED;
      retryOneFa.status = NodeStatus.FAILED;

      const retryTwo = sched.createJob(submission.id, {
        resumeMode: PostRecordResumeMode.CONTINUE,
        attemptOf: retryOne.id,
      });
      sched.plan(retryTwo);
      seedFromPreviousAttempts(
        retryTwo,
        [retryOne, previous],
        PostRecordResumeMode.CONTINUE,
        h,
      );
      resetForResume(retryTwo);

      expect(retryTwo.attemptOf).toBe(retryOne.id);
      expect(tasksOf(retryTwo).fa.units.map((unit) => unit.status)).toEqual([
        NodeStatus.SUCCEEDED,
        NodeStatus.SUCCEEDED,
        NodeStatus.QUEUED,
      ]);
    });

    it('drops a stale task source URL when no posted batch survives', async () => {
      const { sched, previous, submission, h } = previousAttempt();
      submission.files[0] = { ...submission.files[0], id: 'f1-replaced' };
      submission.files[1] = { ...submission.files[1], id: 'f2-replaced' };

      const retry = sched.enqueue(submission.id);
      seedFromPreviousAttempts(
        retry,
        [previous],
        PostRecordResumeMode.CONTINUE,
        h,
      );
      resetForResume(retry);

      const { fa } = tasksOf(retry);
      expect(fa.sourceUrl).toBeUndefined();

      await sched.runToIdle();

      expect(fa.sourceUrl).toMatch(/^https:\/\/furaffinity\//);
      expect(fa.sourceUrl).not.toBe('https://furaffinity/1');
    });

    it('carries a seeded upstream URL to a newly planned dependent site', async () => {
      const submission = fileSubmission();
      submission.options = [
        { accountId: 'a_fa', websiteId: 'furaffinity' },
        { accountId: 'a_cp', websiteId: 'crosspost' },
      ];
      const h = new Harness(submission);
      h.register(fileWebsite({ id: 'furaffinity', fileBatchSize: 3 }));
      h.register(
        fileWebsite({
          id: 'crosspost',
          fileBatchSize: 3,
          acceptsExternalSourceUrls: true,
        }),
      );
      const sched = new RelayScheduler(h, instant);

      // Upstream posted; only the cross-poster failed.
      const previous = sched.enqueue(submission.id);
      const prevFa = previous.tasks.find((t) => t.websiteId === 'furaffinity')!;
      prevFa.units[0].status = NodeStatus.SUCCEEDED;
      prevFa.units[0].sourceUrl = 'https://furaffinity/upstream';
      prevFa.status = NodeStatus.SUCCEEDED;
      prevFa.sourceUrl = 'https://furaffinity/upstream';
      previous.status = NodeStatus.FAILED;

      const retry = sched.enqueue(submission.id);
      seedFromPreviousAttempts(
        retry,
        [previous],
        PostRecordResumeMode.CONTINUE,
        h,
      );
      resetForResume(retry);

      const cp = retry.tasks.find((t) => t.websiteId === 'crosspost')!;
      const fa = retry.tasks.find((t) => t.websiteId === 'furaffinity')!;
      expect(fa.status).toBe(NodeStatus.SUCCEEDED);
      expect(cp.dependency?.tasks).toEqual([fa.id]);

      await sched.runToIdle();

      // The satisfied upstream still supplied its URL to the dependent.
      expect(retry.status).toBe(NodeStatus.SUCCEEDED);
      const parseEntry = h.tracer
        .getEntries(retry.id)
        .find((e) => e.taskId === cp.id && e.stage === 'parse');
      expect(parseEntry?.data?.upstreamSourceUrls).toEqual([
        'https://furaffinity/upstream',
      ]);
    });

    it('restores a destination omitted across multiple intermediate attempts', () => {
      const submission = fileSubmission();
      submission.options = [
        { accountId: 'a_fa', websiteId: 'furaffinity' },
        { accountId: 'a_ws', websiteId: 'weasyl' },
      ];
      const h = new Harness(submission);
      h.register(fileWebsite({ id: 'furaffinity', fileBatchSize: 10 }));
      h.register(fileWebsite({ id: 'weasyl', fileBatchSize: 10 }));
      const sched = new RelayScheduler(h, instant);

      const first = sched.enqueue(submission.id);
      for (const task of first.tasks) {
        task.units[0].status = NodeStatus.SUCCEEDED;
        task.units[0].sourceUrl = `https://${task.websiteId}/first`;
        task.status = NodeStatus.SUCCEEDED;
        task.sourceUrl = task.units[0].sourceUrl;
      }
      first.status = NodeStatus.SUCCEEDED;

      submission.files.push({ ...submission.files[0], id: 'f4', order: 4 });
      submission.options = [{ accountId: 'a_fa', websiteId: 'furaffinity' }];
      const second = sched.createJob(submission.id, {
        resumeMode: PostRecordResumeMode.CONTINUE,
        attemptOf: first.id,
      });
      sched.plan(second);
      seedFromPreviousAttempts(
        second,
        [first],
        PostRecordResumeMode.CONTINUE,
        h,
      );
      resetForResume(second);
      const secondFa = second.tasks[0];
      secondFa.units[1].status = NodeStatus.SUCCEEDED;
      secondFa.units[1].sourceUrl = 'https://furaffinity/current';
      secondFa.status = NodeStatus.SUCCEEDED;
      secondFa.sourceUrl = secondFa.units[1].sourceUrl;
      second.status = NodeStatus.SUCCEEDED;

      const third = sched.createJob(submission.id, {
        resumeMode: PostRecordResumeMode.CONTINUE,
        attemptOf: second.id,
      });
      sched.plan(third);
      seedFromPreviousAttempts(
        third,
        [second, first],
        PostRecordResumeMode.CONTINUE,
        h,
      );
      resetForResume(third);
      third.status = NodeStatus.SUCCEEDED;

      submission.options.push({ accountId: 'a_ws', websiteId: 'weasyl' });
      const restored = sched.createJob(submission.id, {
        resumeMode: PostRecordResumeMode.CONTINUE,
        attemptOf: third.id,
      });
      sched.plan(restored);
      seedFromPreviousAttempts(
        restored,
        [third, second, first],
        PostRecordResumeMode.CONTINUE,
        h,
      );
      resetForResume(restored);

      const restoredWs = restored.tasks.find(
        (task) => task.websiteId === 'weasyl',
      )!;
      expect(
        restoredWs.units.map((unit) => [unit.fileIds, unit.status]),
      ).toEqual([
        [['f1', 'f2', 'f3'], NodeStatus.SUCCEEDED],
        [['f4'], NodeStatus.QUEUED],
      ]);
    });

    it('does not resurrect receipts from before a full-retry reset', () => {
      const { sched, previous, submission, h } = previousAttempt();
      const previousFa = tasksOf(previous).fa;
      previousFa.units[1].status = NodeStatus.FAILED;
      previousFa.units[1].sourceUrl = undefined;

      const fullRetry = sched.createJob(submission.id, {
        resumeMode: PostRecordResumeMode.CONTINUE_RETRY,
        attemptOf: previous.id,
      });
      sched.plan(fullRetry);
      seedFromPreviousAttempts(
        fullRetry,
        [previous],
        PostRecordResumeMode.CONTINUE_RETRY,
        h,
      );
      resetForResume(fullRetry);
      const fullRetryFa = tasksOf(fullRetry).fa;
      fullRetryFa.units[0].status = NodeStatus.FAILED;
      fullRetryFa.units[1].status = NodeStatus.SUCCEEDED;
      fullRetryFa.units[1].sourceUrl = 'https://furaffinity/retry-f2';
      fullRetryFa.units[2].status = NodeStatus.FAILED;
      fullRetryFa.status = NodeStatus.FAILED;

      const continued = sched.createJob(submission.id, {
        resumeMode: PostRecordResumeMode.CONTINUE,
        attemptOf: fullRetry.id,
      });
      sched.plan(continued);
      seedFromPreviousAttempts(
        continued,
        [fullRetry, previous],
        PostRecordResumeMode.CONTINUE,
        h,
      );
      resetForResume(continued);

      expect(unitsByFile(tasksOf(continued).fa)).toEqual([
        ['f2', NodeStatus.SUCCEEDED],
        ['f1', NodeStatus.QUEUED],
        ['f3', NodeStatus.QUEUED],
      ]);
    });

    it('carries a MESSAGE receipt and source URL across an omission', () => {
      const submission: RelaySubmission = {
        id: 'message-submission',
        type: SubmissionType.MESSAGE,
        title: 'Message',
        files: [],
        options: [{ accountId: 'a_msg', websiteId: 'mastodon' }],
      };
      const h = new Harness(submission);
      h.register(
        fileWebsite({
          id: 'mastodon',
          supportsFile: false,
          supportsMessage: true,
        }),
      );
      const sched = new RelayScheduler(h, instant);
      const first = sched.enqueue(submission.id);
      first.tasks[0].units[0].status = NodeStatus.SUCCEEDED;
      first.tasks[0].units[0].sourceUrl = 'https://mastodon/message';
      first.tasks[0].status = NodeStatus.SUCCEEDED;
      first.tasks[0].sourceUrl = 'https://mastodon/message';
      first.status = NodeStatus.SUCCEEDED;

      submission.options = [];
      const omitted = sched.createJob(submission.id, {
        resumeMode: PostRecordResumeMode.CONTINUE,
        attemptOf: first.id,
      });
      sched.plan(omitted);
      omitted.status = NodeStatus.SUCCEEDED;

      submission.options = [{ accountId: 'a_msg', websiteId: 'mastodon' }];
      const restored = sched.createJob(submission.id, {
        resumeMode: PostRecordResumeMode.CONTINUE,
        attemptOf: omitted.id,
      });
      sched.plan(restored);
      seedFromPreviousAttempts(
        restored,
        [omitted, first],
        PostRecordResumeMode.CONTINUE,
        h,
      );
      resetForResume(restored);

      expect(restored.tasks[0].status).toBe(NodeStatus.SUCCEEDED);
      expect(restored.tasks[0].sourceUrl).toBe('https://mastodon/message');
      expect(restored.tasks[0].units[0]).toMatchObject({
        status: NodeStatus.SUCCEEDED,
        sourceUrl: 'https://mastodon/message',
      });
    });

    it('preserves receipts through a planner-skipped zero-unit checkpoint', () => {
      const submission = fileSubmission();
      submission.options = [{ accountId: 'a_fa', websiteId: 'furaffinity' }];
      const h = new Harness(submission);
      h.register(fileWebsite({ id: 'furaffinity', fileBatchSize: 1 }));
      const sched = new RelayScheduler(h, instant);
      const first = sched.enqueue(submission.id);
      for (const unit of first.tasks[0].units) {
        unit.status = NodeStatus.SUCCEEDED;
      }
      first.tasks[0].status = NodeStatus.SUCCEEDED;
      first.status = NodeStatus.SUCCEEDED;

      for (const file of submission.files) {
        file.ignoredWebsites = ['a_fa'];
      }
      const skipped = sched.createJob(submission.id, {
        resumeMode: PostRecordResumeMode.CONTINUE,
        attemptOf: first.id,
      });
      sched.plan(skipped);
      expect(skipped.tasks[0]).toMatchObject({
        status: NodeStatus.SKIPPED,
        units: [],
      });
      skipped.status = NodeStatus.SUCCEEDED;

      for (const file of submission.files) {
        file.ignoredWebsites = [];
      }
      const restored = sched.createJob(submission.id, {
        resumeMode: PostRecordResumeMode.CONTINUE,
        attemptOf: skipped.id,
      });
      sched.plan(restored);
      seedFromPreviousAttempts(
        restored,
        [skipped, first],
        PostRecordResumeMode.CONTINUE,
        h,
      );
      resetForResume(restored);

      expect(
        restored.tasks[0].units.every(
          (unit) => unit.status === NodeStatus.SUCCEEDED,
        ),
      ).toBe(true);
    });

    it('preserves receipts through a dependency-skipped checkpoint', async () => {
      const submission = fileSubmission();
      submission.options = [
        { accountId: 'a_fa', websiteId: 'furaffinity' },
        { accountId: 'a_cp', websiteId: 'crosspost' },
      ];
      const h = new Harness(submission);
      h.register(fileWebsite({ id: 'furaffinity', fileBatchSize: 10 }));
      h.register(
        fileWebsite({
          id: 'crosspost',
          fileBatchSize: 10,
          acceptsExternalSourceUrls: true,
          sourceDependencyMode: 'any',
        }),
      );
      const sched = new RelayScheduler(h, instant);
      const first = sched.enqueue(submission.id);
      for (const task of first.tasks) {
        task.units[0].status = NodeStatus.SUCCEEDED;
        task.status = NodeStatus.SUCCEEDED;
      }
      first.status = NodeStatus.SUCCEEDED;

      submission.files.push({ ...submission.files[0], id: 'f4', order: 4 });
      const skipped = sched.createJob(submission.id, {
        resumeMode: PostRecordResumeMode.CONTINUE,
        attemptOf: first.id,
      });
      sched.plan(skipped);
      seedFromPreviousAttempts(
        skipped,
        [first],
        PostRecordResumeMode.CONTINUE,
        h,
      );
      resetForResume(skipped);
      h.behavior = (website) => {
        if (website.id === 'furaffinity') {
          throw new StageError({
            kind: PostErrorKind.FATAL,
            stage: 'dispatch',
            message: 'failed',
          });
        }
        return {};
      };
      await sched.runToIdle();
      expect(
        skipped.tasks.find((task) => task.websiteId === 'crosspost')?.status,
      ).toBe(NodeStatus.SKIPPED);

      const continued = sched.createJob(submission.id, {
        resumeMode: PostRecordResumeMode.CONTINUE,
        attemptOf: skipped.id,
      });
      sched.plan(continued);
      seedFromPreviousAttempts(
        continued,
        [skipped, first],
        PostRecordResumeMode.CONTINUE,
        h,
      );
      resetForResume(continued);
      const continuedCp = continued.tasks.find(
        (task) => task.websiteId === 'crosspost',
      )!;
      expect(
        continuedCp.units.map((unit) => [unit.fileIds, unit.status]),
      ).toEqual([
        [['f1', 'f2', 'f3'], NodeStatus.SUCCEEDED],
        [['f4'], NodeStatus.QUEUED],
      ]);
    });

    it('retains a removed file receipt when the same id is re-added', () => {
      const submission = fileSubmission();
      submission.options = [{ accountId: 'a_fa', websiteId: 'furaffinity' }];
      const removed = submission.files[0];
      const h = new Harness(submission);
      h.register(fileWebsite({ id: 'furaffinity', fileBatchSize: 1 }));
      const sched = new RelayScheduler(h, instant);
      const first = sched.enqueue(submission.id);
      for (const unit of first.tasks[0].units) {
        unit.status = NodeStatus.SUCCEEDED;
      }
      first.tasks[0].status = NodeStatus.SUCCEEDED;
      first.status = NodeStatus.SUCCEEDED;

      submission.files = submission.files.slice(1);
      const second = sched.createJob(submission.id, {
        resumeMode: PostRecordResumeMode.CONTINUE,
        attemptOf: first.id,
      });
      sched.plan(second);
      seedFromPreviousAttempts(
        second,
        [first],
        PostRecordResumeMode.CONTINUE,
        h,
      );
      resetForResume(second);
      second.status = NodeStatus.SUCCEEDED;

      submission.files = [removed, ...submission.files];
      const restored = sched.createJob(submission.id, {
        resumeMode: PostRecordResumeMode.CONTINUE,
        attemptOf: second.id,
      });
      sched.plan(restored);
      seedFromPreviousAttempts(
        restored,
        [second, first],
        PostRecordResumeMode.CONTINUE,
        h,
      );
      resetForResume(restored);

      expect(
        restored.tasks[0].units.every(
          (unit) => unit.status === NodeStatus.SUCCEEDED,
        ),
      ).toBe(true);
    });

    it('completes a no-change continuation without dispatching', async () => {
      const submission = fileSubmission();
      submission.options = [{ accountId: 'a_fa', websiteId: 'furaffinity' }];
      const h = new Harness(submission);
      h.register(fileWebsite({ id: 'furaffinity', fileBatchSize: 10 }));
      const dispatch = jest.fn().mockReturnValue({});
      h.behavior = dispatch;
      const sched = new RelayScheduler(h, instant);
      const first = sched.enqueue(submission.id);
      first.tasks[0].units[0].status = NodeStatus.SUCCEEDED;
      first.tasks[0].status = NodeStatus.SUCCEEDED;
      first.status = NodeStatus.SUCCEEDED;

      const continued = sched.createJob(submission.id, {
        resumeMode: PostRecordResumeMode.CONTINUE,
        attemptOf: first.id,
      });
      sched.plan(continued);
      seedFromPreviousAttempts(
        continued,
        [first],
        PostRecordResumeMode.CONTINUE,
        h,
      );
      resetForResume(continued);
      await sched.runToIdle();

      expect(continued.status).toBe(NodeStatus.SUCCEEDED);
      expect(dispatch).not.toHaveBeenCalled();
    });

    it('resets a delivered MESSAGE after an incomplete skipped checkpoint', () => {
      const submission: RelaySubmission = {
        id: 'message-retry',
        type: SubmissionType.MESSAGE,
        title: 'Message',
        files: [],
        options: [{ accountId: 'a_msg', websiteId: 'mastodon' }],
      };
      const h = new Harness(submission);
      h.register(
        fileWebsite({
          id: 'mastodon',
          supportsFile: false,
          supportsMessage: true,
        }),
      );
      const sched = new RelayScheduler(h, instant);
      const first = sched.enqueue(submission.id);
      first.tasks[0].units[0].status = NodeStatus.SUCCEEDED;
      first.tasks[0].status = NodeStatus.SUCCEEDED;
      first.status = NodeStatus.SUCCEEDED;

      h.register(
        fileWebsite({
          id: 'mastodon',
          supportsFile: false,
          supportsMessage: false,
        }),
      );
      const skipped = sched.createJob(submission.id, {
        resumeMode: PostRecordResumeMode.CONTINUE,
        attemptOf: first.id,
      });
      sched.plan(skipped);
      skipped.status = NodeStatus.SUCCEEDED;

      h.register(
        fileWebsite({
          id: 'mastodon',
          supportsFile: false,
          supportsMessage: true,
        }),
      );
      const retried = sched.createJob(submission.id, {
        resumeMode: PostRecordResumeMode.CONTINUE_RETRY,
        attemptOf: skipped.id,
      });
      sched.plan(retried);
      seedFromPreviousAttempts(
        retried,
        [skipped, first],
        PostRecordResumeMode.CONTINUE_RETRY,
        h,
      );
      resetForResume(retried);

      expect(retried.tasks[0].units[0].status).toBe(NodeStatus.QUEUED);
    });

    it('retries all files for an incomplete destination restored after omission', () => {
      const { sched, previous, submission, h } = previousAttempt();
      submission.options = [{ accountId: 'a_ws', websiteId: 'weasyl' }];
      const omitted = sched.createJob(submission.id, {
        resumeMode: PostRecordResumeMode.CONTINUE,
        attemptOf: previous.id,
      });
      sched.plan(omitted);
      omitted.status = NodeStatus.SUCCEEDED;

      submission.options.push({
        accountId: 'a_fa',
        websiteId: 'furaffinity',
      });
      const restored = sched.createJob(submission.id, {
        resumeMode: PostRecordResumeMode.CONTINUE_RETRY,
        attemptOf: omitted.id,
      });
      sched.plan(restored);
      seedFromPreviousAttempts(
        restored,
        [omitted, previous],
        PostRecordResumeMode.CONTINUE_RETRY,
        h,
      );
      resetForResume(restored);

      expect(
        tasksOf(restored).fa.units.every(
          (unit) => unit.status === NodeStatus.QUEUED,
        ),
      ).toBe(true);
    });

    it('prefers the current URL and retains it on a third continuation', async () => {
      const submission = fileSubmission();
      submission.options = [
        { accountId: 'a_fa', websiteId: 'furaffinity' },
        { accountId: 'a_cp', websiteId: 'crosspost' },
      ];
      const h = new Harness(submission);
      h.register(fileWebsite({ id: 'furaffinity', fileBatchSize: 10 }));
      h.register(
        fileWebsite({
          id: 'crosspost',
          fileBatchSize: 10,
          acceptsExternalSourceUrls: true,
          sourceDependencyMode: 'allSettled',
        }),
      );
      const sched = new RelayScheduler(h, instant);
      const first = sched.enqueue(submission.id);
      const firstFa = first.tasks.find(
        (task) => task.websiteId === 'furaffinity',
      )!;
      firstFa.units[0].status = NodeStatus.SUCCEEDED;
      firstFa.units[0].sourceUrl = 'https://furaffinity/old';
      firstFa.status = NodeStatus.SUCCEEDED;
      firstFa.sourceUrl = 'https://furaffinity/old';
      const firstCp = first.tasks.find(
        (task) => task.websiteId === 'crosspost',
      )!;
      firstCp.units[0].status = NodeStatus.FAILED;
      firstCp.status = NodeStatus.FAILED;
      first.status = NodeStatus.FAILED;

      submission.files.push({ ...submission.files[0], id: 'f4', order: 4 });
      const second = sched.createJob(submission.id, {
        resumeMode: PostRecordResumeMode.CONTINUE,
        attemptOf: first.id,
      });
      sched.plan(second);
      seedFromPreviousAttempts(
        second,
        [first],
        PostRecordResumeMode.CONTINUE,
        h,
      );
      resetForResume(second);
      h.behavior = (website) => ({
        sourceUrl:
          website.id === 'furaffinity'
            ? 'https://furaffinity/current'
            : 'https://crosspost/current',
      });

      await sched.runToIdle();

      const secondFa = second.tasks.find(
        (task) => task.websiteId === 'furaffinity',
      )!;
      const secondCp = second.tasks.find(
        (task) => task.websiteId === 'crosspost',
      )!;
      expect(secondFa.sourceUrl).toBe('https://furaffinity/current');
      const parseEntry = h.tracer
        .getEntries(second.id)
        .find(
          (entry) => entry.taskId === secondCp.id && entry.stage === 'parse',
        );
      expect(parseEntry?.data?.upstreamSourceUrls).toEqual([
        'https://furaffinity/current',
      ]);

      const third = sched.createJob(submission.id, {
        resumeMode: PostRecordResumeMode.CONTINUE,
        attemptOf: second.id,
      });
      sched.plan(third);
      seedFromPreviousAttempts(
        third,
        [second, first],
        PostRecordResumeMode.CONTINUE,
        h,
      );
      resetForResume(third);
      expect(
        third.tasks.find((task) => task.websiteId === 'furaffinity')?.sourceUrl,
      ).toBe('https://furaffinity/current');
    });

    it('restores a historical URL before an allSettled dependent runs after failure', async () => {
      const submission = fileSubmission();
      submission.options = [
        { accountId: 'a_fa', websiteId: 'furaffinity' },
        { accountId: 'a_cp', websiteId: 'crosspost' },
      ];
      const h = new Harness(submission);
      h.register(fileWebsite({ id: 'furaffinity', fileBatchSize: 10 }));
      h.register(
        fileWebsite({
          id: 'crosspost',
          fileBatchSize: 10,
          acceptsExternalSourceUrls: true,
          sourceDependencyMode: 'allSettled',
        }),
      );
      const sched = new RelayScheduler(h, instant);
      const first = sched.enqueue(submission.id);
      const firstFa = first.tasks.find(
        (task) => task.websiteId === 'furaffinity',
      )!;
      firstFa.units[0].status = NodeStatus.SUCCEEDED;
      firstFa.units[0].sourceUrl = 'https://furaffinity/old';
      firstFa.status = NodeStatus.SUCCEEDED;
      firstFa.sourceUrl = 'https://furaffinity/old';
      first.status = NodeStatus.FAILED;

      submission.files.push({ ...submission.files[0], id: 'f4', order: 4 });
      const retry = sched.createJob(submission.id, {
        resumeMode: PostRecordResumeMode.CONTINUE,
        attemptOf: first.id,
      });
      sched.plan(retry);
      seedFromPreviousAttempts(
        retry,
        [first],
        PostRecordResumeMode.CONTINUE,
        h,
      );
      resetForResume(retry);
      h.behavior = (website) => {
        if (website.id === 'furaffinity') {
          throw new StageError({
            kind: PostErrorKind.FATAL,
            stage: 'dispatch',
            message: 'failed',
          });
        }
        return { sourceUrl: 'https://crosspost/current' };
      };

      await sched.runToIdle();

      const retryFa = retry.tasks.find(
        (task) => task.websiteId === 'furaffinity',
      )!;
      const retryCp = retry.tasks.find(
        (task) => task.websiteId === 'crosspost',
      )!;
      expect(retryFa.sourceUrl).toBe('https://furaffinity/old');
      const parseEntry = h.tracer
        .getEntries(retry.id)
        .find(
          (entry) => entry.taskId === retryCp.id && entry.stage === 'parse',
        );
      expect(parseEntry?.data?.upstreamSourceUrls).toEqual([
        'https://furaffinity/old',
      ]);
    });
  });
});
