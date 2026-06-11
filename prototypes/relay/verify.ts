/**
 * Relay posting framework — self-checking verification harness.
 *
 * Fast, deterministic assertions over the engine's invariants. Uses an instant
 * `wait` override and zero-rate-limit sites so it runs in well under a second.
 *
 * Run with:
 *   node --experimental-strip-types prototypes/relay/verify.ts
 */

import { ErrorKind, StageError } from './engine/errors.ts';
import {
    type Dependency,
    evaluateDependency,
    NodeStatus,
    PostJob,
    ResumeMode,
    type Submission,
    SubmissionType,
    WebsiteTask,
} from './engine/model.ts';
import { rateKey, RateLimiter } from './engine/rate-limit.ts';
import { Scheduler } from './engine/scheduler.ts';
import { projectJob, Tracer } from './engine/trace.ts';
import {
    buildTransformPlan,
    type Encoder,
    runTransform,
    TransformCache,
} from './engine/transform.ts';
import {
    bluesky,
    defaultRegistry,
    downSiteState,
    weasyl,
} from './engine/websites.ts';

let passed = 0;
let failed = 0;

function assert(cond: boolean, msg: string): void {
  if (cond) {
    passed++;
    console.log(`  ✓ ${msg}`);
  } else {
    failed++;
    console.error(`  ✗ ${msg}`);
  }
}

function instantScheduler(tracer: Tracer): Scheduler {
  return new Scheduler(
    {
      registry: defaultRegistry,
      rateLimiter: new RateLimiter(),
      cache: new TransformCache(),
      tracer,
    },
    { maxConcurrentJobs: 4, maxConcurrentTasks: 8, wait: () => Promise.resolve() },
  );
}

const img = (
  id: string,
  order: number,
  over: Partial<{ mime: string; w: number; h: number; bytes: number; ignored: string[] }> = {},
) => ({
  id,
  fileName: `${id}.${(over.mime ?? 'image/jpeg').split('/')[1]}`,
  mimeType: over.mime ?? 'image/jpeg',
  width: over.w ?? 3000,
  height: over.h ?? 3000,
  bytes: over.bytes ?? 9_000_000,
  hash: `hash-${id}`,
  order,
  ignoredWebsites: over.ignored,
});

// ---------------------------------------------------------------------------

function testResizeMeetsConstraints(): void {
  console.log('\n[resize] outputs always satisfy the plan post-conditions');
  const cache = new TransformCache();
  const files = [
    img('a', 0, { mime: 'image/jpeg', w: 4000, h: 4000, bytes: 12_000_000 }),
    img('b', 1, { mime: 'image/png', w: 3000, h: 3000, bytes: 9_000_000 }),
    img('c', 2, { mime: 'image/webp', w: 1500, h: 1500, bytes: 800_000 }),
  ];
  for (const site of [weasyl, bluesky]) {
    for (const f of files) {
      const plan = buildTransformPlan(f, 'acct', site.fileConstraints!, site.calculateImageResize?.(f));
      const { output } = runTransform(f, plan, cache);
      const okBytes = plan.maxBytes === undefined || output.bytes <= plan.maxBytes;
      const okW = plan.maxWidth === undefined || output.width <= plan.maxWidth;
      const okH = plan.maxHeight === undefined || output.height <= plan.maxHeight;
      const okMime = site.fileConstraints!.acceptedMimeTypes.includes(output.mimeType);
      assert(okBytes && okW && okH && okMime, `${site.id}/${f.id}: ${output.width}x${output.height} ${output.bytes}B ${output.mimeType} within caps`);
    }
  }
}

function testTransformFailsWhenImpossible(): void {
  console.log('\n[resize] impossible constraint fails with a precise TRANSFORM_FAILED');
  const cache = new TransformCache();
  const f = img('z', 0, { mime: 'image/jpeg', w: 4000, h: 4000, bytes: 12_000_000 });
  const plan = buildTransformPlan(f, 'acct', { acceptedMimeTypes: ['image/jpeg'], maxBytes: { '*': 1 } });
  let threw: StageError | undefined;
  try {
    runTransform(f, plan, cache);
  } catch (e) {
    threw = e as StageError;
  }
  assert(!!threw && threw.kind === ErrorKind.TRANSFORM_FAILED, 'throws TRANSFORM_FAILED when 1-byte cap is unreachable');
}

function testCacheReuse(): void {
  console.log('\n[cache] identical (sourceHash + plan) is computed once');
  const cache = new TransformCache();
  const f = img('cacheme', 0, { mime: 'image/jpeg', w: 2000, h: 2000, bytes: 3_000_000 });
  const plan = buildTransformPlan(f, 'acct', weasyl.fileConstraints!, weasyl.calculateImageResize?.(f));
  const first = runTransform(f, plan, cache);
  const second = runTransform(f, plan, cache);
  assert(first.output.fromCache === false, 'first transform is a cache miss');
  assert(second.output.fromCache === true, 'second identical transform is a cache hit');
  assert(cache.hits === 1 && cache.misses === 1, 'cache stats: 1 hit / 1 miss');
}

function testPlanBatching(): void {
  console.log('\n[plan] batching, ignored files, and unsupported-type skips');
  const submission: Submission = {
    id: 's_b',
    type: SubmissionType.FILE,
    title: 'Batch Test',
    files: [
      img('f1', 0, { mime: 'image/jpeg' }),
      img('f2', 1, { mime: 'image/jpeg' }),
      img('f3', 2, { mime: 'image/jpeg', ignored: ['fa1'] }),
    ],
    options: [
      { accountId: 'fa1', websiteId: 'furaffinity', title: 't', description: 'd', tags: [] }, // batch 1
      { accountId: 'ws1', websiteId: 'weasyl', title: 't', description: 'd', tags: [] }, // batch 3
      { accountId: 'md1', websiteId: 'mastodon', title: 't', description: 'd', tags: [] }, // message-only → SKIP
    ],
  };
  const tracer = new Tracer({ writeToDisk: false });
  const sched = instantScheduler(tracer);
  const job = sched.enqueue(submission);
  const fa = job.tasks.find((t) => t.websiteId === 'furaffinity')!;
  const ws = job.tasks.find((t) => t.websiteId === 'weasyl')!;
  const md = job.tasks.find((t) => t.websiteId === 'mastodon')!;
  assert(fa.units.length === 2, `furaffinity (batch 1, f3 ignored) → 2 units (got ${fa.units.length})`);
  assert(ws.units.length === 1, `weasyl (batch 3, all 3 files) → 1 unit (got ${ws.units.length})`);
  assert(md.status === NodeStatus.SKIPPED, 'mastodon (message-only) → SKIPPED for a FILE submission');
}

function testRateLimiterPure(): void {
  console.log('\n[rate] persisted bucket computes correct wait windows');
  const rl = new RateLimiter();
  const t0 = 1_000_000;
  assert(rl.waitMs('acct', 1000, t0) === 0, 'no prior post → no wait');
  rl.markPosted('acct', t0);
  assert(rl.waitMs('acct', 1000, t0 + 200) === 800, '200ms after posting with 1000ms interval → wait 800ms');
  assert(rl.waitMs('acct', 1000, t0 + 1000) === 0, 'after the interval → no wait');
}

function testRateKeyScopes(): void {
  console.log('\n[rate] rateKey honors website scope; shared limiter throttles across accounts');
  assert(rateKey('account', 'fa', 'a1') === 'a:a1', "scope 'account' → keyed by account");
  assert(rateKey('website', 'fa', 'a1') === 'w:fa', "scope 'website' → keyed by website");
  assert(rateKey('website+account', 'fa', 'a1') === 'w:fa|a:a1', "scope 'website+account' → both");

  // One shared limiter; a 'website'-scoped site means two different accounts
  // share the same window.
  const rl = new RateLimiter();
  const t0 = 1_000_000;
  const k1 = rateKey('website', 'fa', 'a1');
  const k2 = rateKey('website', 'fa', 'a2');
  rl.markPosted(k1, t0);
  assert(rl.waitMs(k2, 1000, t0 + 200) === 800, 'second account on a website-scoped site still waits');

  // Default account scope: the two accounts are independent.
  const rl2 = new RateLimiter();
  rl2.markPosted(rateKey('account', 'fa', 'a1'), t0);
  assert(
    rl2.waitMs(rateKey('account', 'fa', 'a2'), 1000, t0 + 200) === 0,
    'account-scoped: a different account does not wait',
  );
}

function task(id: string, dependency?: Dependency): WebsiteTask {
  return new WebsiteTask({ id, jobId: 'j', accountId: 'a', websiteId: 'w', idempotencyKey: id, dependency });
}

function testDependencyModes(): void {
  console.log('\n[deps] any/all/count gating + reachability');
  // Build a tiny job with three upstream tasks we can set statuses on.
  const job = new PostJob({ id: 'j', submission: { id: 's', type: SubmissionType.FILE, title: 't', files: [], options: [] } });
  const up1 = task('up1');
  const up2 = task('up2');
  const up3 = task('up3');
  job.tasks.push(up1, up2, up3);

  const ids = ['up1', 'up2', 'up3'];
  const anyT = task('any', { mode: 'any', tasks: ids });
  const allT = task('all', { mode: 'all', tasks: ids });
  const cntT = task('cnt', { mode: 'count', tasks: ids, n: 2 });
  job.tasks.push(anyT, allT, cntT);

  // Initially all upstream QUEUED → everything pending.
  assert(evaluateDependency(job, anyT) === 'pending', "any: pending while no upstream has succeeded");
  assert(evaluateDependency(job, allT) === 'pending', 'all: pending while upstream incomplete');
  assert(evaluateDependency(job, cntT) === 'pending', 'count(2): pending at 0 successes');

  // One upstream succeeds.
  up1.status = NodeStatus.SUCCEEDED;
  assert(evaluateDependency(job, anyT) === 'satisfied', 'any: satisfied after first success');
  assert(evaluateDependency(job, cntT) === 'pending', 'count(2): still pending at 1 success');
  assert(evaluateDependency(job, allT) === 'pending', 'all: still pending');

  // Second succeeds → count(2) satisfied; all still pending.
  up2.status = NodeStatus.SUCCEEDED;
  assert(evaluateDependency(job, cntT) === 'satisfied', 'count(2): satisfied at 2 successes');
  assert(evaluateDependency(job, allT) === 'pending', 'all: still pending (up3 not done)');

  // Third is SKIPPED → all satisfied (skip counts as done for all).
  up3.status = NodeStatus.SKIPPED;
  assert(evaluateDependency(job, allT) === 'satisfied', 'all: satisfied when remaining upstream SKIPPED');
}

function testDependencyBlocked(): void {
  console.log('\n[deps] unreachable gates resolve to blocked (→ dependent gets SKIPPED)');
  const job = new PostJob({ id: 'j2', submission: { id: 's', type: SubmissionType.FILE, title: 't', files: [], options: [] } });
  const up1 = task('u1');
  const up2 = task('u2');
  job.tasks.push(up1, up2);
  const cnt = task('c', { mode: 'count', tasks: ['u1', 'u2'], n: 2 });
  const allT = task('a', { mode: 'all', tasks: ['u1', 'u2'] });
  job.tasks.push(cnt, allT);

  up1.status = NodeStatus.SUCCEEDED;
  up2.status = NodeStatus.FAILED;
  assert(evaluateDependency(job, cnt) === 'blocked', 'count(2): blocked when only 1 can ever succeed');
  assert(evaluateDependency(job, allT) === 'blocked', 'all: blocked when an upstream FAILED');
}

async function testAnyModeRunsEarly(): Promise<void> {
  console.log('\n[deps] any-mode site posts after the FIRST upstream URL (end-to-end)');
  downSiteState.recovered = true;
  // anyflcd: an external-source site with sourceDependencyMode 'any'.
  const submission: Submission = {
    id: 's_any',
    type: SubmissionType.MESSAGE,
    title: 'Any Test',
    files: [],
    options: [
      { accountId: 'md1', websiteId: 'mastodon', title: 't', description: 'd', tags: [] },
      { accountId: 'bs1', websiteId: 'crosspost', title: 't', description: 'd', tags: [] },
    ],
  };
  const tracer = new Tracer({ writeToDisk: false });
  const sched = instantScheduler(tracer);
  const job = sched.enqueue(submission);
  const cp = job.tasks.find((t) => t.websiteId === 'crosspost')!;
  assert(cp.dependency?.mode === 'any', "crosspost wired with 'any' dependency mode");
  await sched.runToIdle();
  assert(projectJob(job).status === NodeStatus.SUCCEEDED, 'job SUCCEEDED with any-mode dependency');
  assert(!!cp.sourceUrl, 'crosspost posted (after first upstream URL)');
}

function testEncoderSeam(): void {
  console.log('\n[resize] encoder seam is swappable; verify guard still holds');
  // A custom encoder that always reports a tiny size: verify must accept it,
  // proving the verify loop trusts the (swappable) encoder's reported bytes.
  const tinyEncoder: Encoder = { encode: () => 1000 };
  const cache = new TransformCache();
  const f = img('seam', 0, { mime: 'image/jpeg', w: 4000, h: 4000, bytes: 12_000_000 });
  const plan = buildTransformPlan(f, 'acct', { acceptedMimeTypes: ['image/jpeg'], maxBytes: { '*': 2000 } });
  const { output, iterations } = runTransform(f, plan, cache, tinyEncoder);
  assert(output.bytes === 1000 && output.bytes <= 2000, 'custom encoder output (1000B) passes the 2000B verify gate');
  assert(iterations.length === 1, 'no shrink iterations needed when encoder already fits');
}

async function testSourceUrlPropagation(): Promise<void> {
  console.log('\n[propagation] external-source site runs last and inherits upstream URLs');
  downSiteState.recovered = true; // keep downthenup healthy here
  const submission: Submission = {
    id: 's_prop',
    type: SubmissionType.FILE,
    title: 'Prop Test',
    files: [img('p1', 0, { mime: 'image/jpeg', w: 1500, h: 1500, bytes: 500_000 })],
    options: [
      { accountId: 'ws1', websiteId: 'weasyl', title: 't', description: 'd', tags: [] },
      { accountId: 'dtu1', websiteId: 'downthenup', title: 't', description: 'd', tags: [] },
      { accountId: 'bs1', websiteId: 'bluesky', title: 't', description: 'd', tags: [] },
    ],
  };
  const tracer = new Tracer({ writeToDisk: false });
  const sched = instantScheduler(tracer);
  const job = sched.enqueue(submission);
  const bs = job.tasks.find((t) => t.websiteId === 'bluesky')!;
  assert(
    bs.dependency?.mode === 'all' && bs.dependency.tasks.length === 2,
    `bluesky has an 'all' dependency on the 2 standard tasks (got ${bs.dependency?.mode}/${bs.dependency?.tasks.length})`,
  );
  await sched.runToIdle();
  assert(projectJob(job).status === NodeStatus.SUCCEEDED, 'job SUCCEEDED');
  const parseEntry = tracer
    .getEntries(job.id)
    .find((e) => e.taskId === bs.id && e.stage === 'parse');
  const upstreamCount = (parseEntry?.data?.upstreamSourceUrls as string[] | undefined)?.length ?? -1;
  assert(upstreamCount === 2, `bluesky parsed 2 upstream source URLs (got ${upstreamCount})`);
}

async function testResumePreservesProgress(): Promise<void> {
  console.log('\n[resume] CONTINUE re-runs only non-done units; succeeded batch is preserved');
  downSiteState.recovered = false;
  const submission: Submission = {
    id: 's_res',
    type: SubmissionType.FILE,
    title: 'Resume Test',
    files: [
      img('r1', 0, { mime: 'image/jpeg', w: 1200, h: 1200, bytes: 1_000_000 }),
      img('r2', 1, { mime: 'image/jpeg', w: 1200, h: 1200, bytes: 1_000_000 }),
      img('r3', 2, { mime: 'image/jpeg', w: 1200, h: 1200, bytes: 1_000_000 }),
    ],
    options: [
      { accountId: 'dtu1', websiteId: 'downthenup', title: 't', description: 'd', tags: [] }, // batch 2 → batches [r1,r2] [r3]
    ],
  };
  const tracer = new Tracer({ writeToDisk: false });
  const sched = instantScheduler(tracer);
  const job: PostJob = sched.enqueue(submission);
  await sched.runToIdle();

  const dtu = job.tasks.find((t) => t.websiteId === 'downthenup')!;
  assert(projectJob(job).status === NodeStatus.FAILED, 'first run FAILED (site down on batch 2)');
  assert(dtu.units[0].status === NodeStatus.SUCCEEDED, 'batch #1 SUCCEEDED on first run');
  assert(dtu.units[1].status === NodeStatus.FAILED, 'batch #2 FAILED on first run');
  const batch1Url = dtu.units[0].sourceUrl;

  downSiteState.recovered = true;
  sched.resume(job.id, ResumeMode.CONTINUE);
  await sched.runToIdle();

  assert(projectJob(job).status === NodeStatus.SUCCEEDED, 'after resume the job SUCCEEDED');
  assert(dtu.units[0].status === NodeStatus.SUCCEEDED && dtu.units[0].sourceUrl === batch1Url, 'batch #1 URL unchanged (not re-posted)');
  assert(dtu.units[1].status === NodeStatus.SUCCEEDED, 'batch #2 SUCCEEDED after resume');
}

async function main(): Promise<void> {
  console.log('Relay framework — verification harness');
  testResizeMeetsConstraints();
  testTransformFailsWhenImpossible();
  testEncoderSeam();
  testCacheReuse();
  testPlanBatching();
  testRateLimiterPure();
  testRateKeyScopes();
  testDependencyModes();
  testDependencyBlocked();
  await testSourceUrlPropagation();
  await testAnyModeRunsEarly();
  await testResumePreservesProgress();

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`  ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error('verify crashed:', err);
  process.exitCode = 1;
});
