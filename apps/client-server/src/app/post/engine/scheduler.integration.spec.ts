import { NodeStatus, PostErrorKind, PostRecordResumeMode, SubmissionType } from '@postybirb/types';
import { CancellableToken } from '../models/cancellable-token';
import { PostingFile } from '../models/posting-file';
import { StageError } from './errors';
import { RelayTask } from './model';
import {
    PipelineDeps,
    RelayDispatchData,
    RelaySubmission,
} from './pipeline';
import { MemoryRateStore, RateLimiter } from './rate-limiter';
import { RelayScheduler } from './scheduler';
import { RelayTracer } from './tracer.service';
import { RelayPostResult, RelayWebsite } from './websites';

// ---------------------------------------------------------------------------
// Mock websites + harness
// ---------------------------------------------------------------------------

const IMAGE_ONLY = {
  acceptedMimeTypes: ['image/jpeg', 'image/png'],
  maxBytes: { '*': 10_000_000 },
  conversion: { 'image/webp': 'image/png' },
};

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
    fileConstraints: over.fileConstraints ?? IMAGE_ONLY,
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
    return { postData: { title: this.submission.title }, sourceUrls: upstreamSourceUrls };
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
        ({ id, fileName: `${id}.jpg`, mimeType: 'image/jpeg' }) as unknown as PostingFile,
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
      { id: 'f1', fileName: 'f1.jpg', mimeType: 'image/jpeg', width: 1200, height: 1200, bytes: 500_000, hash: 'h1', order: 0 },
      { id: 'f2', fileName: 'f2.jpg', mimeType: 'image/jpeg', width: 1200, height: 1200, bytes: 500_000, hash: 'h2', order: 1 },
      { id: 'f3', fileName: 'f3.jpg', mimeType: 'image/jpeg', width: 1200, height: 1200, bytes: 500_000, hash: 'h3', order: 2 },
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
      fileWebsite({ id: 'bluesky', fileBatchSize: 4, acceptsExternalSourceUrls: true }),
    );

    const sched = new RelayScheduler(h, { ...instant, maxConcurrentJobs: 2, maxConcurrentTasks: 4 });
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
        throw new StageError({ kind: PostErrorKind.TRANSIENT, stage: 'dispatch', message: '503' });
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
    h.register(fileWebsite({ id: 'furaffinity', fileBatchSize: 1, minimumPostWaitInterval: 50 }));

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
    expect(job.tasks[0].units.slice(1).every((u) => u.status === NodeStatus.CANCELLED)).toBe(true);
  });

  it('resume (CONTINUE) re-runs only non-done units', async () => {
    const submission = fileSubmission();
    submission.options = [{ accountId: 'a_dt', websiteId: 'downthenup' }];
    const h = new Harness(submission);
    h.register(fileWebsite({ id: 'downthenup', fileBatchSize: 2 }));

    let recovered = false;
    h.behavior = (w, _d, batchIndex) => {
      if (!recovered && batchIndex > 0) {
        throw new StageError({ kind: PostErrorKind.TRANSIENT, stage: 'dispatch', message: 'down' });
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
    h.register(fileWebsite({ id: 'mastodon', supportsFile: false, supportsMessage: true } as Partial<RelayWebsite>));
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
        throw Object.assign(new Error('socket hang up'), { code: 'ECONNRESET' });
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
      fileWebsite({ id: 'crosspost', fileBatchSize: 3, acceptsExternalSourceUrls: true, sourceDependencyMode: 'any' }),
    );

    const sched = new RelayScheduler(h, instant);
    const job = sched.enqueue(submission.id);
    const cp = job.tasks.find((t) => t.websiteId === 'crosspost')!;
    expect(cp.dependency?.mode).toBe('any');

    await sched.runToIdle();
    expect(job.status).toBe(NodeStatus.SUCCEEDED);
    expect(cp.sourceUrl).toBeTruthy();
  });
});
