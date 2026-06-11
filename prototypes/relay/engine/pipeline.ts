/**
 * Relay posting framework — staged pipeline (runs one WebsiteTask pass).
 *
 * A task pass executes ordered stages. Task-level prep runs once; the
 * dispatch loop then runs per Unit (file batch / message) so that partial
 * progress is preserved: already-SUCCEEDED units are skipped on a re-run.
 *
 *   Resolve -> Authenticate -> Parse -> Validate -> Plan
 *        -> [ per unit:  Transform -> Gate -> Dispatch -> Capture ]
 *        -> Settle
 *
 * Each stage emits a structured trace line and short-circuits with a typed
 * StageError. Rate-limit gating throws RATE_LIMITED so the scheduler can put
 * the task into WAITING and resume it without re-posting completed units.
 * Cancellation is via a standard AbortSignal.
 */

import { ErrorKind, StageError, toTaskError } from './errors.ts';
import {
    depTaskIds,
    NodeStatus,
    PostJob,
    ResumeMode,
    type SourceFile,
    SubmissionType,
    TERMINAL_DONE,
    Unit,
    UnitKind,
    WebsiteTask,
} from './model.ts';
import { rateKey, RateLimiter } from './rate-limit.ts';
import { Tracer } from './trace.ts';
import {
    buildTransformPlan,
    runTransform,
    TransformCache,
    type TransformedFile,
} from './transform.ts';
import {
    type ParsedPostData,
    type Website,
    WebsiteRegistry,
} from './websites.ts';

export type PipelineDeps = {
  registry: WebsiteRegistry;
  rateLimiter: RateLimiter;
  cache: TransformCache;
  tracer: Tracer;
};

function throwIfAborted(signal: AbortSignal, stage: string): void {
  if (signal.aborted) {
    throw new StageError({
      kind: ErrorKind.FATAL,
      stage,
      message: 'cancelled',
    });
  }
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Job planning: submission -> job tree
// ---------------------------------------------------------------------------

export function planJob(
  job: PostJob,
  registry: WebsiteRegistry,
): void {
  const { submission } = job;
  // Pass 1: create a task per website option that supports the type.
  for (const opt of submission.options) {
    const site = registry.get(opt.websiteId);
    const supports =
      submission.type === SubmissionType.FILE
        ? site.supportsFile
        : site.supportsMessage;

    const task = new WebsiteTask({
      id: `t_${opt.websiteId}_${opt.accountId}`,
      jobId: job.id,
      accountId: opt.accountId,
      websiteId: opt.websiteId,
      idempotencyKey: `${job.id}:${opt.websiteId}:${opt.accountId}`,
    });

    if (!supports) {
      task.status = NodeStatus.SKIPPED;
      job.tasks.push(task);
      continue;
    }

    // Build units.
    if (submission.type === SubmissionType.FILE) {
      const files = submission.files
        .filter((f) => !f.ignoredWebsites?.includes(opt.accountId))
        .sort((a, b) => a.order - b.order);
      if (files.length === 0) {
        task.status = NodeStatus.SKIPPED;
      } else {
        const size = Math.max(1, site.fileBatchSize);
        let ordinal = 0;
        for (let i = 0; i < files.length; i += size) {
          const batch = files.slice(i, i + size);
          task.units.push(
            new Unit({
              id: `u_${task.id}_b${ordinal}`,
              taskId: task.id,
              kind: UnitKind.BATCH,
              ordinal,
              fileIds: batch.map((f) => f.id),
            }),
          );
          ordinal++;
        }
      }
    } else {
      task.units.push(
        new Unit({
          id: `u_${task.id}_m`,
          taskId: task.id,
          kind: UnitKind.MESSAGE,
          ordinal: 0,
        }),
      );
    }

    job.tasks.push(task);
  }

  // Pass 2: wire source-url dependencies. Tasks that accept external source
  // urls depend on the "standard" tasks so they run later and inherit URLs.
  // The website chooses how many upstream sources it needs via
  // `sourceDependencyMode` (default 'all'); 'any' lets it post as soon as the
  // first upstream URL exists.
  const standard = job.tasks.filter(
    (t) =>
      t.status !== NodeStatus.SKIPPED &&
      !registry.get(t.websiteId).acceptsExternalSourceUrls,
  );
  const standardIds = standard.map((s) => s.id);
  for (const t of job.tasks) {
    if (t.status === NodeStatus.SKIPPED) continue;
    const site = registry.get(t.websiteId);
    if (!site.acceptsExternalSourceUrls || standardIds.length === 0) continue;

    const mode = site.sourceDependencyMode ?? 'all';
    if (mode === 'all') {
      t.dependency = { mode: 'all', tasks: standardIds };
    } else if (mode === 'any') {
      t.dependency = { mode: 'any', tasks: standardIds };
    } else {
      t.dependency = {
        mode: 'count',
        tasks: standardIds,
        n: Math.min(mode.count, standardIds.length),
      };
    }
  }
}

/**
 * Resume planner. Re-opens non-done nodes to QUEUED.
 *  - CONTINUE: keep SUCCEEDED units, re-run FAILED/incomplete.
 *  - RETRY: also re-run SUCCEEDED units (full re-upload), keeping the task.
 *  - NEW handled by the caller (builds a fresh job).
 */
export function resetForResume(job: PostJob, mode: ResumeMode): void {
  for (const task of job.tasks) {
    if (task.status === NodeStatus.SKIPPED) continue;
    let hasWork = false;
    for (const unit of task.units) {
      if (mode === ResumeMode.RETRY) {
        unit.status = NodeStatus.QUEUED;
        unit.sourceUrl = undefined;
        unit.error = undefined;
      } else if (!TERMINAL_DONE.has(unit.status)) {
        unit.status = NodeStatus.QUEUED;
        unit.error = undefined;
      }
      if (!TERMINAL_DONE.has(unit.status)) hasWork = true;
    }
    if (hasWork || task.units.length === 0) {
      task.status = NodeStatus.QUEUED;
      task.error = undefined;
      task.waitingUntil = undefined;
    } else {
      task.status = NodeStatus.SUCCEEDED;
    }
  }
}

// ---------------------------------------------------------------------------
// Single task pass
// ---------------------------------------------------------------------------

function findFile(job: PostJob, id: string): SourceFile {
  const f = job.submission.files.find((x) => x.id === id);
  if (!f) {
    throw new StageError({
      kind: ErrorKind.FATAL,
      stage: 'transform',
      message: `file ${id} not found`,
    });
  }
  return f;
}

function collectUpstreamSourceUrls(job: PostJob, task: WebsiteTask): string[] {
  const urls: string[] = [];
  for (const depId of depTaskIds(task)) {
    const dep = job.tasks.find((t) => t.id === depId);
    if (dep?.sourceUrl) urls.push(dep.sourceUrl);
  }
  return urls;
}

/**
 * Run a single pass of the pipeline for one task. Throws StageError on failure
 * (including RATE_LIMITED to request a WAITING re-queue). Idempotent w.r.t.
 * already-SUCCEEDED units.
 */
export async function runTaskPass(
  deps: PipelineDeps,
  job: PostJob,
  task: WebsiteTask,
  signal: AbortSignal,
): Promise<void> {
  const { registry, rateLimiter, cache, tracer } = deps;
  const baseTrace = {
    jobId: job.id,
    taskId: task.id,
    account: task.accountId,
    website: task.websiteId,
  };

  // 1. Resolve
  throwIfAborted(signal, 'resolve');
  const site: Website = registry.get(task.websiteId);
  tracer.emit({ ...baseTrace, level: 'debug', stage: 'resolve', event: 'stage.ok' });

  // 2. Authenticate (mock: always ok)
  throwIfAborted(signal, 'authenticate');
  tracer.emit({ ...baseTrace, level: 'debug', stage: 'authenticate', event: 'stage.ok' });

  // 3. Parse — build post data and inject upstream source urls.
  throwIfAborted(signal, 'parse');
  const opt = job.submission.options.find((o) => o.accountId === task.accountId)!;
  const upstream = collectUpstreamSourceUrls(job, task);
  const parsed: ParsedPostData = {
    title: opt.title,
    description: opt.description,
    tags: opt.tags,
    sourceUrls: upstream,
  };
  tracer.emit({
    ...baseTrace,
    level: 'debug',
    stage: 'parse',
    event: 'stage.ok',
    data: { upstreamSourceUrls: upstream },
  });

  // 4. Validate
  throwIfAborted(signal, 'validate');
  const validation = site.validate(parsed);
  if (validation.errors.length > 0) {
    throw new StageError({
      kind: ErrorKind.VALIDATION_FAILED,
      stage: 'validate',
      message: validation.errors.join('; '),
    });
  }
  tracer.emit({ ...baseTrace, level: 'debug', stage: 'validate', event: 'stage.ok' });

  // 5. Plan (files only) — build a transform plan per file up front.
  const plans = new Map<string, ReturnType<typeof buildTransformPlan>>();
  if (job.submission.type === SubmissionType.FILE && site.fileConstraints) {
    for (const file of job.submission.files) {
      if (file.ignoredWebsites?.includes(task.accountId)) continue;
      const websiteResize = site.calculateImageResize?.(file);
      const plan = buildTransformPlan(
        file,
        task.accountId,
        site.fileConstraints,
        websiteResize,
      );
      plans.set(file.id, plan);
      tracer.emit({
        ...baseTrace,
        level: 'debug',
        stage: 'plan',
        event: 'file.planned',
        unitId: undefined,
        data: { fileId: file.id, plan },
      });
    }
  }

  // ---- per-unit dispatch loop ----
  for (const unit of task.units) {
    if (TERMINAL_DONE.has(unit.status)) continue; // resume: skip completed
    throwIfAborted(signal, 'dispatch');
    unit.status = NodeStatus.RUNNING;

    // 6. Transform (files only)
    let transformed: TransformedFile[] = [];
    if (unit.kind === UnitKind.BATCH) {
      for (const fileId of unit.fileIds) {
        const file = findFile(job, fileId);
        const plan = plans.get(fileId)!;
        const { output, iterations } = runTransform(file, plan, cache);
        transformed.push(output);
        tracer.emit({
          ...baseTrace,
          level: 'info',
          stage: 'transform',
          event: 'file.resized',
          unitId: unit.id,
          data: {
            fileId,
            from: { w: file.width, h: file.height, bytes: file.bytes, mime: file.mimeType },
            to: { w: output.width, h: output.height, bytes: output.bytes, mime: output.mimeType },
            steps: output.appliedSteps,
            iterations: iterations.length,
            fromCache: output.fromCache,
          },
        });
      }
    }

    // 7. Gate (rate limit, keyed by the website's declared scope)
    const interval = site.minimumPostWaitInterval;
    const bucket = rateKey(site.rateLimitScope, task.websiteId, task.accountId);
    const waitMs = rateLimiter.waitMs(bucket, interval);
    if (waitMs > 0) {
      task.waitingUntil = Date.now() + waitMs;
      tracer.emit({
        ...baseTrace,
        level: 'info',
        stage: 'gate',
        event: 'rate.wait',
        unitId: unit.id,
        data: {
          waitMs,
          bucket,
          scope: site.rateLimitScope ?? 'account',
          waitingUntil: new Date(task.waitingUntil).toISOString(),
        },
      });
      // Revert this unit to QUEUED; scheduler will WAIT and re-run the pass.
      unit.status = NodeStatus.QUEUED;
      throw new StageError({
        kind: ErrorKind.RATE_LIMITED,
        stage: 'gate',
        message: `rate-limited; wait ${waitMs}ms`,
        retryAfterMs: waitMs,
      });
    }

    // 8. Dispatch
    const ctx = { signal, attempt: task.attempts + 1 };
    let result;
    try {
      if (unit.kind === UnitKind.BATCH) {
        const batchUnits = task.units.filter((u) => u.kind === UnitKind.BATCH);
        result = await site.onPostFileSubmission!(parsed, transformed, ctx, {
          index: unit.ordinal,
          total: batchUnits.length,
        });
      } else {
        result = await site.onPostMessageSubmission!(parsed, ctx);
      }
    } catch (err) {
      const se =
        err instanceof StageError
          ? err
          : new StageError({
              kind: ErrorKind.TRANSIENT,
              stage: 'dispatch',
              message: String((err as Error)?.message ?? err),
              cause: err,
            });
      unit.status = NodeStatus.FAILED;
      unit.error = toTaskError(se);
      tracer.emit({
        ...baseTrace,
        level: 'error',
        stage: 'dispatch',
        event: 'unit.failed',
        unitId: unit.id,
        data: { kind: se.kind, message: se.message },
      });
      throw se;
    }

    // 9. Capture
    rateLimiter.markPosted(bucket);
    unit.sourceUrl = result.sourceUrl;
    unit.status = NodeStatus.SUCCEEDED;
    unit.error = undefined;
    task.waitingUntil = undefined;
    if (!task.sourceUrl) task.sourceUrl = result.sourceUrl;
    tracer.emit({
      ...baseTrace,
      level: 'info',
      stage: 'capture',
      event: 'unit.posted',
      unitId: unit.id,
      data: { sourceUrl: result.sourceUrl, message: result.message },
    });
    tracer.pushTaskDelta(job, task);
  }

  // 10. Settle
  task.status = NodeStatus.SUCCEEDED;
  tracer.emit({
    ...baseTrace,
    level: 'info',
    stage: 'settle',
    event: 'task.succeeded',
    data: { sourceUrl: task.sourceUrl },
  });
}
