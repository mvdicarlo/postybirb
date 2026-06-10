/**
 * Relay posting framework — runnable end-to-end demo.
 *
 * Run with:
 *   node --experimental-strip-types prototypes/relay/demo.ts
 *
 * Demonstrates, with no external dependencies and no cloud:
 *   A. A multi-account FILE post: file batching, accurate resize (plan +
 *      verify loop), source-url propagation via dependency gating, per-account
 *      rate-limit WAITING, transient-error retry, transform cache reuse.
 *   B. Resume after failure: partial progress (a succeeded batch) is preserved;
 *      only the failed batch re-runs; transforms are served from cache.
 *   C. Dry-run preview: stages 1–6 with no dispatch (parsed data + resize
 *      results) — a built-in safety check / test harness.
 *
 * Output: a live UI-delta log, the final UI projection tree, the filtered DB
 * ledger, cache stats, and the path to the per-job NDJSON trace.
 */

import {
    NodeStatus,
    ResumeMode,
    type Submission,
    SubmissionType,
} from './engine/model.ts';
import { RateLimiter } from './engine/rate-limit.ts';
import { Scheduler } from './engine/scheduler.ts';
import { type JobTreeNode, projectJob, projectLedger, Tracer } from './engine/trace.ts';
import { buildTransformPlan, runTransform, TransformCache } from './engine/transform.ts';
import {
    defaultRegistry,
    downSiteState,
} from './engine/websites.ts';

// ---------------------------------------------------------------------------
// Pretty printing
// ---------------------------------------------------------------------------

const STATUS_ICON: Record<string, string> = {
  QUEUED: '·',
  READY: '•',
  RUNNING: '▶',
  WAITING: '⏳',
  SUCCEEDED: '✓',
  FAILED: '✗',
  SKIPPED: '⊘',
  CANCELLED: '⊗',
};

function hr(title: string): void {
  console.log(`\n${'═'.repeat(72)}\n  ${title}\n${'═'.repeat(72)}`);
}

function printTree(node: JobTreeNode, indent = ''): void {
  const icon = STATUS_ICON[node.status] ?? '?';
  let line = `${indent}${icon} [${node.status}] ${node.label}`;
  if (node.progress) line += `  (${node.progress.done}/${node.progress.total})`;
  if (node.sourceUrl) line += `  → ${node.sourceUrl}`;
  if (node.waitingUntil) line += `  waitUntil=${node.waitingUntil}`;
  if (node.error) line += `  ⚠ ${node.error.kind}@${node.error.stage}: ${node.error.message}`;
  console.log(line);
  for (const child of node.children ?? []) printTree(child, `${indent}   `);
}

function bytes(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}MB`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}KB`;
  return `${n}B`;
}

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

function sunsetSubmission(): Submission {
  return {
    id: 's_sunset',
    type: SubmissionType.FILE,
    title: 'Sunset Painting',
    files: [
      {
        id: 'f_big_jpeg',
        fileName: 'sunset.jpg',
        mimeType: 'image/jpeg',
        width: 4000,
        height: 4000,
        bytes: 12_000_000,
        hash: 'hash-big-jpeg',
        order: 0,
        altText:
          'A very long alt text describing the sunset in exhaustive painterly detail that exceeds limits',
      },
      {
        id: 'f_big_png',
        fileName: 'lines.png',
        mimeType: 'image/png',
        width: 3000,
        height: 3000,
        bytes: 9_000_000,
        hash: 'hash-big-png',
        order: 1,
      },
      {
        id: 'f_webp',
        fileName: 'sketch.webp',
        mimeType: 'image/webp', // needs conversion for furaffinity/weasyl
        width: 1500,
        height: 1500,
        bytes: 800_000,
        hash: 'hash-webp',
        order: 2,
        ignoredWebsites: ['fa_main'], // user excluded this file from FurAffinity
      },
    ],
    options: [
      { accountId: 'fa_main', websiteId: 'furaffinity', title: 'Sunset', description: 'My sunset piece', tags: ['art', 'sunset'] },
      { accountId: 'ws_main', websiteId: 'weasyl', title: 'Sunset', description: 'My sunset piece', tags: ['art'] },
      { accountId: 'fk_main', websiteId: 'flaky', title: 'Sunset', description: 'My sunset piece', tags: ['art'] },
      { accountId: 'bs_main', websiteId: 'bluesky', title: 'Sunset', description: 'My sunset piece 🌅', tags: ['art'] },
    ],
  };
}

function comicSubmission(): Submission {
  const file = (id: string, order: number) => ({
    id,
    fileName: `${id}.jpg`,
    mimeType: 'image/jpeg',
    width: 1200,
    height: 1800,
    bytes: 2_000_000,
    hash: `hash-${id}`,
    order,
  });
  return {
    id: 's_comic',
    type: SubmissionType.FILE,
    title: 'Comic Page',
    files: [file('c_p1', 0), file('c_p2', 1), file('c_p3', 2)],
    options: [
      { accountId: 'fa_alt', websiteId: 'furaffinity', title: 'Comic', description: 'page', tags: ['comic'] },
      { accountId: 'dtu_main', websiteId: 'downthenup', title: 'Comic', description: 'page', tags: ['comic'] },
    ],
  };
}

// ---------------------------------------------------------------------------
// Demo runner
// ---------------------------------------------------------------------------

function makeScheduler(cache: TransformCache, tracer: Tracer): Scheduler {
  const deps = {
    registry: defaultRegistry,
    rateLimiter: new RateLimiter(),
    cache,
    tracer,
  };
  return new Scheduler(deps, { maxConcurrentJobs: 2, maxConcurrentTasks: 4 });
}

async function scenarioA(): Promise<void> {
  hr('Scenario A — Multi-account FILE post (the showcase)');
  const cache = new TransformCache();
  const tracer = new Tracer({ writeToDisk: true });

  // Live UI deltas (what the UI would render incrementally).
  tracer.onDelta((node) => {
    if (node.kind === 'task') {
      const icon = STATUS_ICON[node.status];
      const extra = node.waitingUntil
        ? ` (waiting ${Math.max(0, Math.round((new Date(node.waitingUntil).getTime() - Date.now()) / 100) / 10)}s)`
        : node.sourceUrl
          ? ` → ${node.sourceUrl}`
          : '';
      console.log(`   ┊ delta: ${icon} ${node.label} [${node.status}]${extra}`);
    }
  });

  const sched = makeScheduler(cache, tracer);
  const job = sched.enqueue(sunsetSubmission());
  console.log(`   enqueued ${job.id} with ${job.tasks.length} tasks`);
  console.log('   (furaffinity is rate-limited; flaky fails once; bluesky waits for the rest)\n');

  const start = Date.now();
  await sched.runToIdle();
  const elapsed = Date.now() - start;

  hr('Scenario A — Final UI projection');
  printTree(projectJob(job));

  // Prove source-url propagation: bluesky depends on the standard sites.
  const bluesky = job.tasks.find((t) => t.websiteId === 'bluesky')!;
  hr('Scenario A — Source-URL propagation');
  console.log(
    `   bluesky ran last (dependency mode='${bluesky.dependency?.mode}', ${
      bluesky.dependency?.tasks.length ?? 0
    } upstream tasks) and embedded upstream URLs:`,
  );
  for (const t of job.tasks) {
    if (t.websiteId !== 'bluesky' && t.sourceUrl) {
      console.log(`     • ${t.websiteId}: ${t.sourceUrl}`);
    }
  }

  hr('Scenario A — Resize accuracy (from the trace)');
  for (const e of projectLedger(tracer, job.id).filter((x) => x.event === 'file.resized')) {
    const d = e.data as any;
    console.log(
      `   ${e.website}: ${d.fileId}  ${d.from.w}x${d.from.h} ${bytes(d.from.bytes)} ${d.from.mime}` +
        `  →  ${d.to.w}x${d.to.h} ${bytes(d.to.bytes)} ${d.to.mime}` +
        `  [${d.steps.join(', ') || 'no-op'}]${d.fromCache ? ' (cache)' : ''}`,
    );
  }

  hr('Scenario A — Stats');
  console.log(`   elapsed: ${elapsed}ms`);
  console.log(`   transform cache: ${cache.hits} hits, ${cache.misses} misses`);
  console.log(`   trace lines: ${tracer.getEntries(job.id).length}`);
  console.log(`   ledger (UI/history) lines: ${projectLedger(tracer, job.id).length}`);
  console.log(`   NDJSON trace file: prototypes/relay/traces/${job.id}.ndjson`);
}

async function scenarioB(): Promise<void> {
  hr('Scenario B — Resume after failure (partial progress preserved)');
  const cache = new TransformCache();
  const tracer = new Tracer({ writeToDisk: true });
  const sched = makeScheduler(cache, tracer);

  // Site starts "down": its 2nd batch will fail.
  downSiteState.recovered = false;

  const job = sched.enqueue(comicSubmission());
  console.log(`   enqueued ${job.id}; 'downthenup' will fail on batch 2 (site down)\n`);
  await sched.runToIdle();

  hr('Scenario B — After first run (FAILED)');
  printTree(projectJob(job));
  const dtu = job.tasks.find((t) => t.websiteId === 'downthenup')!;
  const doneUnits = dtu.units.filter((u) => u.status === NodeStatus.SUCCEEDED).length;
  console.log(`\n   downthenup: ${doneUnits}/${dtu.units.length} batches succeeded before failure`);
  const cacheAfterRun1 = { hits: cache.hits, misses: cache.misses };

  // Site recovers; resume in CONTINUE mode (re-run only non-done nodes).
  console.log('\n   …site recovers; resuming (CONTINUE)…');
  downSiteState.recovered = true;
  sched.resume(job.id, ResumeMode.CONTINUE);
  await sched.runToIdle();

  hr('Scenario B — After resume (SUCCEEDED)');
  printTree(projectJob(job));
  console.log(
    `\n   transform cache: +${cache.hits - cacheAfterRun1.hits} hits on resume ` +
      `(succeeded batch's files were NOT re-encoded)`,
  );
  console.log(`   final job status: ${projectJob(job).status}`);
}

function scenarioC(): void {
  hr('Scenario C — Dry-run preview (stages 1–6, no posting)');
  const cache = new TransformCache();
  const submission = sunsetSubmission();
  const site = defaultRegistry.get('weasyl'); // tight limits → interesting plan
  const account = 'ws_main';
  console.log(`   Preview: "${submission.title}" → ${site.displayName} (${account})`);
  for (const file of submission.files) {
    if (file.ignoredWebsites?.includes(account)) {
      console.log(`     ⊘ ${file.fileName}: excluded by user for this account`);
      continue;
    }
    const plan = buildTransformPlan(
      file,
      account,
      site.fileConstraints!,
      site.calculateImageResize?.(file),
    );
    const { output, iterations } = runTransform(file, plan, cache);
    console.log(
      `     • ${file.fileName}: ${file.width}x${file.height} ${bytes(file.bytes)} ${file.mimeType}` +
        `  →  ${output.width}x${output.height} ${bytes(output.bytes)} ${output.mimeType}` +
        `  q${output.quality}  [${output.appliedSteps.join(', ') || 'no-op'}]  (${iterations.length} verify iterations)`,
    );
  }
  console.log('   No network calls were made. Use this to validate before queueing.');
}

async function main(): Promise<void> {
  console.log('Relay posting framework — prototype demo');
  console.log('(erasable TypeScript, runs on Node with --experimental-strip-types, zero deps)');
  await scenarioA();
  await scenarioB();
  scenarioC();
  hr('Done');
  console.log('   Inspect the raw JSON traces under prototypes/relay/traces/*.ndjson');
}

main().catch((err) => {
  console.error('demo failed:', err);
  process.exitCode = 1;
});
