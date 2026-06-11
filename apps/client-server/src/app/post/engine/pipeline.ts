/**
 * Relay engine — staged pipeline (runs one task pass).
 *
 *   Resolve -> Authenticate -> Parse -> Validate -> Plan
 *        -> [ per unit: Transform -> Gate -> Dispatch -> Capture ]
 *        -> Settle
 *
 * Each stage emits a trace line and short-circuits with a typed StageError.
 * Rate-limit gating throws RATE_LIMITED so the scheduler parks the task in
 * WAITING and resumes the pass without re-posting completed units.
 *
 * The pipeline depends only on the abstract {@link PipelineDeps} seams so it is
 * unit-testable with mocks; the scheduler supplies production implementations.
 */

/* eslint-disable no-param-reassign */ // the engine mutates the job tree in place

import {
    Dependency,
    NodeStatus,
    PostErrorKind,
    PostRecordResumeMode,
    SubmissionType,
    UnitKind,
} from '@postybirb/types';
import { CancellableToken } from '../models/cancellable-token';
import { StageError, toTaskError } from './errors';
import {
    RelayJob,
    RelayTask,
    RelayUnit,
    TERMINAL_DONE,
    depTaskIds,
} from './model';
import { RateLimiter, rateKey } from './rate-limiter';
import { RelayTracer } from './tracer.service';
import {
    Encoder,
    RelaySourceFile,
    TransformCache,
    TransformedFile,
    buildTransformPlan,
    runTransform,
} from './transform';
import { RelayPostResult, RelayWebsite } from './websites';

/** Submission shape the engine needs to plan and run a job. */
export interface RelaySubmission {
  id: string;
  type: SubmissionType;
  title: string;
  files: Array<RelaySourceFile & { order: number; ignoredWebsites?: string[] }>;
  options: Array<{ accountId: string; websiteId: string }>;
}

/** Source-URL-bearing data dispatched to a website. */
export interface RelayDispatchData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  postData: any;
  sourceUrls: string[];
}

/**
 * Seams the pipeline needs. The scheduler provides production implementations
 * (registry via WebsiteRegistryService + adapter, builder via
 * PostParsersService, etc.); tests provide mocks.
 */
export interface PipelineDeps {
  getWebsite(websiteId: string, accountId: string): RelayWebsite;
  getSubmission(submissionId: string): RelaySubmission;
  /** Build the parsed post data for a task, injecting upstream source URLs. */
  buildPostData(
    task: RelayTask,
    upstreamSourceUrls: string[],
  ): Promise<RelayDispatchData>;
  /** Validate the parsed data; return error messages (empty = ok). */
  validate(task: RelayTask, data: RelayDispatchData): Promise<string[]>;
  /** Dispatch a batch of files. */
  dispatchFile(
    website: RelayWebsite,
    data: RelayDispatchData,
    files: TransformedFile[],
    token: CancellableToken,
    batch: { index: number; totalBatches: number },
  ): Promise<RelayPostResult>;
  /** Dispatch a message. */
  dispatchMessage(
    website: RelayWebsite,
    data: RelayDispatchData,
    token: CancellableToken,
  ): Promise<RelayPostResult>;
  rateLimiter: RateLimiter;
  cache: TransformCache;
  encoder: Encoder;
  tracer: RelayTracer;
}

// ---------------------------------------------------------------------------
// Job planning
// ---------------------------------------------------------------------------

export function planJob(job: RelayJob, deps: PipelineDeps): void {
  const submission = deps.getSubmission(job.submissionId);

  for (const opt of submission.options) {
    const site = deps.getWebsite(opt.websiteId, opt.accountId);
    const supports =
      submission.type === SubmissionType.FILE
        ? site.supportsFile
        : site.supportsMessage;

    const task = new RelayTask({
      id: `${job.id}:t:${opt.websiteId}:${opt.accountId}`,
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

    if (submission.type === SubmissionType.FILE) {
      const files = submission.files
        .filter((f) => !f.ignoredWebsites?.includes(opt.accountId))
        .sort((a, b) => a.order - b.order);
      if (files.length === 0) {
        task.status = NodeStatus.SKIPPED;
      } else {
        const size = site.fileBatchSize;
        let ordinal = 0;
        for (let i = 0; i < files.length; i += size) {
          const batch = files.slice(i, i + size);
          task.units.push(
            new RelayUnit({
              id: `${task.id}:b${ordinal}`,
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
        new RelayUnit({
          id: `${task.id}:m`,
          taskId: task.id,
          kind: UnitKind.MESSAGE,
          ordinal: 0,
        }),
      );
    }

    job.tasks.push(task);
  }

  // Wire source-url dependencies: external-source sites depend on standard ones.
  const standard = job.tasks.filter(
    (t) =>
      t.status !== NodeStatus.SKIPPED &&
      !deps.getWebsite(t.websiteId, t.accountId).acceptsExternalSourceUrls,
  );
  const standardIds = standard.map((s) => s.id);

  for (const t of job.tasks) {
    if (t.status === NodeStatus.SKIPPED || standardIds.length === 0) continue;
    const site = deps.getWebsite(t.websiteId, t.accountId);
    if (!site.acceptsExternalSourceUrls) continue;

    const mode = site.sourceDependencyMode;
    let dependency: Dependency;
    if (mode === 'all') dependency = { mode: 'all', tasks: standardIds };
    else if (mode === 'any') dependency = { mode: 'any', tasks: standardIds };
    else
      dependency = {
        mode: 'count',
        tasks: standardIds,
        n: Math.min(mode.count, standardIds.length),
      };
    t.dependency = dependency;
  }
}

/**
 * Resume planner. Re-opens non-done nodes to QUEUED.
 *  - CONTINUE: keep SUCCEEDED units, re-run the rest.
 *  - CONTINUE_RETRY: also re-run SUCCEEDED units (full re-upload).
 *  - NEW handled by the caller (builds a fresh job).
 */
export function resetForResume(job: RelayJob, mode: PostRecordResumeMode): void {
  for (const task of job.tasks) {
    if (task.status === NodeStatus.SKIPPED) continue;
    let hasWork = false;
    for (const unit of task.units) {
      if (mode === PostRecordResumeMode.CONTINUE_RETRY) {
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
// Task pass
// ---------------------------------------------------------------------------

function throwIfAborted(token: CancellableToken, stage: string): void {
  if (token.isCancelled) {
    throw new StageError({ kind: PostErrorKind.FATAL, stage, message: 'cancelled' });
  }
}

function collectUpstreamSourceUrls(job: RelayJob, task: RelayTask): string[] {
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
  job: RelayJob,
  task: RelayTask,
  token: CancellableToken,
): Promise<void> {
  const { tracer } = deps;
  const submission = deps.getSubmission(job.submissionId);
  const base = {
    jobId: job.id,
    taskId: task.id,
    account: task.accountId,
    website: task.websiteId,
  };

  // 1. Resolve
  throwIfAborted(token, 'resolve');
  const site = deps.getWebsite(task.websiteId, task.accountId);
  tracer.emit({ ...base, level: 'debug', stage: 'resolve', event: 'stage.ok' });

  // 2. Authenticate (delegated to dispatch in production; placeholder here)
  throwIfAborted(token, 'authenticate');
  tracer.emit({ ...base, level: 'debug', stage: 'authenticate', event: 'stage.ok' });

  // 3. Parse — build post data and inject upstream source URLs.
  throwIfAborted(token, 'parse');
  const upstream = collectUpstreamSourceUrls(job, task);
  const data = await deps.buildPostData(task, upstream);
  tracer.emit({
    ...base,
    level: 'debug',
    stage: 'parse',
    event: 'stage.ok',
    data: { upstreamSourceUrls: upstream },
  });

  // 4. Validate
  throwIfAborted(token, 'validate');
  const errors = await deps.validate(task, data);
  if (errors.length > 0) {
    throw new StageError({
      kind: PostErrorKind.VALIDATION_FAILED,
      stage: 'validate',
      message: errors.join('; '),
    });
  }
  tracer.emit({ ...base, level: 'debug', stage: 'validate', event: 'stage.ok' });

  // 5. Plan (files only)
  const plans = new Map<string, ReturnType<typeof buildTransformPlan>>();
  if (submission.type === SubmissionType.FILE && site.fileConstraints) {
    for (const file of submission.files) {
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
        ...base,
        level: 'debug',
        stage: 'plan',
        event: 'file.planned',
        data: { fileId: file.id, plan },
      });
    }
  }

  // ---- per-unit dispatch loop ----
  for (const unit of task.units) {
    if (TERMINAL_DONE.has(unit.status)) continue;
    throwIfAborted(token, 'dispatch');
    unit.status = NodeStatus.RUNNING;

    // 6. Transform (files only)
    const transformed: TransformedFile[] = [];
    if (unit.kind === UnitKind.BATCH) {
      for (const fileId of unit.fileIds) {
        const file = submission.files.find((f) => f.id === fileId);
        const plan = plans.get(fileId);
        if (!file || !plan) {
          throw new StageError({
            kind: PostErrorKind.FATAL,
            stage: 'transform',
            message: `file ${fileId} not found`,
          });
        }
        // eslint-disable-next-line no-await-in-loop
        const { output, iterations } = await runTransform(
          file,
          plan,
          deps.cache,
          deps.encoder,
        );
        transformed.push(output);
        tracer.emit({
          ...base,
          level: 'info',
          stage: 'transform',
          event: 'file.resized',
          unitId: unit.id,
          data: {
            fileId,
            from: {
              w: file.width,
              h: file.height,
              bytes: file.bytes,
              mime: file.mimeType,
            },
            to: {
              w: output.width,
              h: output.height,
              bytes: output.bytes,
              mime: output.mimeType,
            },
            steps: output.appliedSteps,
            iterations: iterations.length,
            fromCache: output.fromCache,
          },
        });
      }
    }

    // 7. Gate (rate limit, keyed by the website's scope)
    const bucket = rateKey(site.rateLimitScope, task.websiteId, task.accountId);
    // eslint-disable-next-line no-await-in-loop
    const waitMs = await deps.rateLimiter.waitMs(
      bucket,
      site.minimumPostWaitInterval,
    );
    if (waitMs > 0) {
      task.waitingUntil = Date.now() + waitMs;
      tracer.emit({
        ...base,
        level: 'info',
        stage: 'gate',
        event: 'rate.wait',
        unitId: unit.id,
        data: { waitMs, bucket, scope: site.rateLimitScope },
      });
      unit.status = NodeStatus.QUEUED;
      throw new StageError({
        kind: PostErrorKind.RATE_LIMITED,
        stage: 'gate',
        message: `rate-limited; wait ${waitMs}ms`,
        retryAfterMs: waitMs,
      });
    }

    // 8. Dispatch
    let result: RelayPostResult;
    try {
      if (unit.kind === UnitKind.BATCH) {
        const batchUnits = task.units.filter((u) => u.kind === UnitKind.BATCH);
        // eslint-disable-next-line no-await-in-loop
        result = await deps.dispatchFile(site, data, transformed, token, {
          index: unit.ordinal,
          totalBatches: batchUnits.length,
        });
      } else {
        // eslint-disable-next-line no-await-in-loop
        result = await deps.dispatchMessage(site, data, token);
      }
    } catch (err) {
      const se =
        err instanceof StageError
          ? err
          : new StageError({
              kind: PostErrorKind.TRANSIENT,
              stage: 'dispatch',
              message: String((err as Error)?.message ?? err),
              cause: err,
            });
      unit.status = NodeStatus.FAILED;
      unit.error = toTaskError(se);
      tracer.emit({
        ...base,
        level: 'error',
        stage: 'dispatch',
        event: 'unit.failed',
        unitId: unit.id,
        data: { kind: se.kind, message: se.message },
      });
      throw se;
    }

    // 9. Capture
    // eslint-disable-next-line no-await-in-loop
    await deps.rateLimiter.markPosted(bucket);
    unit.sourceUrl = result.sourceUrl;
    unit.status = NodeStatus.SUCCEEDED;
    unit.error = undefined;
    task.waitingUntil = undefined;
    if (!task.sourceUrl && result.sourceUrl) task.sourceUrl = result.sourceUrl;
    tracer.emit({
      ...base,
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
    ...base,
    level: 'info',
    stage: 'settle',
    event: 'task.succeeded',
    data: { sourceUrl: task.sourceUrl },
  });
}
