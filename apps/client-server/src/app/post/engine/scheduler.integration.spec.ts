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
