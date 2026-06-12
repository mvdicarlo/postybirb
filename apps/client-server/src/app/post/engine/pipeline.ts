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
import { PostingFile } from '../models/posting-file';
import {
  PIPELINE_STAGES,
  SOURCE_DEPENDENCY_MODES,
  TRACER_FILE_EVENTS,
  TRACER_RATE_EVENTS,
  TRACER_STAGE_EVENTS,
  TRACER_TASK_EVENTS,
} from './constants';
import {
  StageError,
  classify,
  isDeliveryUncertainError,
  toTaskError,
} from './errors';
import {
  RelayJob,
  RelayTask,
  RelayUnit,
  TERMINAL_DONE,
  depTaskIds,
} from './model';
import { RateLimiter, rateKey } from './rate-limiter';
import { RelayTracer } from './tracer.service';
import { RelaySourceFile } from './transform';
import { RelayPostResult, RelayWebsite } from './websites';

/**
 * Maximum cumulative time a single task may stay parked on rate-limit gates in
 * one run before it is failed terminally. Prevents shared-bucket starvation.
 */
const RATE_LIMIT_WAIT_CEILING_MS = 60 * 60 * 1000; // 1 hour

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
 * (registry via WebsiteRegistryService + adapter, parser via PostParsersService,
 * file processing via RelayFileProcessor, etc.); tests provide mocks.
 *
 * Context-bearing lookups take the owning jobId so concurrent jobs that share
 * an account resolve the correct per-job submission context.
 */
export interface PipelineDeps {
  getWebsite(jobId: string, websiteId: string, accountId: string): RelayWebsite;
  getSubmission(jobId: string): RelaySubmission;
  /**
   * Ensure the task's website/account session is authenticated before posting.
   * Optional so test mocks can omit it; production logs in (re-logging in if a
   * session has expired) and throws if it cannot establish a session.
   */
  authenticate?(task: RelayTask): Promise<void>;
  /** Build the parsed post data for a task, injecting upstream source URLs. */
  buildPostData(
    task: RelayTask,
    upstreamSourceUrls: string[],
  ): Promise<RelayDispatchData>;
  /** Validate the parsed data; return error messages (empty = ok). */
  validate(task: RelayTask, data: RelayDispatchData): Promise<string[]>;
  /**
   * Process a batch of files (convert/resize/thumbnail/verify) into
   * ready-to-post PostingFiles, injecting the given source URLs into metadata.
   */
  processBatch(
    task: RelayTask,
    fileIds: string[],
    sourceUrls: string[],
    token: CancellableToken,
  ): Promise<PostingFile[]>;
  /** Dispatch a batch of files. */
  dispatchFile(
    website: RelayWebsite,
    data: RelayDispatchData,
    files: PostingFile[],
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
  tracer: RelayTracer;
}

// ---------------------------------------------------------------------------
// Job planning
// ---------------------------------------------------------------------------

export function planJob(job: RelayJob, deps: PipelineDeps): void {
  const submission = deps.getSubmission(job.id);

  for (const opt of submission.options) {
    const site = deps.getWebsite(job.id, opt.websiteId, opt.accountId);
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
      !deps.getWebsite(job.id, t.websiteId, t.accountId)
        .acceptsExternalSourceUrls,
  );
  const standardIds = standard.map((s) => s.id);

  for (const t of job.tasks) {
    if (t.status === NodeStatus.SKIPPED || standardIds.length === 0) continue;
    const site = deps.getWebsite(job.id, t.websiteId, t.accountId);
    if (!site.acceptsExternalSourceUrls) continue;

    const mode = site.sourceDependencyMode;
    let dependency: Dependency;
    if (mode === SOURCE_DEPENDENCY_MODES.ALL) {
      dependency = { mode: SOURCE_DEPENDENCY_MODES.ALL, tasks: standardIds };
    } else if (mode === SOURCE_DEPENDENCY_MODES.ANY) {
      dependency = { mode: SOURCE_DEPENDENCY_MODES.ANY, tasks: standardIds };
    } else
      dependency = {
        mode: SOURCE_DEPENDENCY_MODES.COUNT,
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
export function resetForResume(
  job: RelayJob,
  mode: PostRecordResumeMode,
): void {
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
    throw new StageError({
      kind: PostErrorKind.FATAL,
      stage,
      message: 'cancelled',
    });
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
  const base = {
    jobId: job.id,
    taskId: task.id,
    account: task.accountId,
    website: task.websiteId,
  };

  // 1. Resolve
  throwIfAborted(token, PIPELINE_STAGES.RESOLVE);
  const site = deps.getWebsite(job.id, task.websiteId, task.accountId);
  tracer.emit({
    ...base,
    level: 'debug',
    stage: PIPELINE_STAGES.RESOLVE,
    event: TRACER_STAGE_EVENTS.OK,
  });

  // 2. Authenticate — ensure the account session is live (re-login if expired).
  throwIfAborted(token, PIPELINE_STAGES.AUTHENTICATE);
  try {
    await deps.authenticate?.(task);
  } catch (err) {
    throw classify(PIPELINE_STAGES.AUTHENTICATE, err);
  }
  tracer.emit({
    ...base,
    level: 'debug',
    stage: PIPELINE_STAGES.AUTHENTICATE,
    event: TRACER_STAGE_EVENTS.OK,
  });

  // 3. Parse — build post data and inject upstream source URLs.
  throwIfAborted(token, PIPELINE_STAGES.PARSE);
  const upstream = collectUpstreamSourceUrls(job, task);
  let data: RelayDispatchData;
  try {
    data = await deps.buildPostData(task, upstream);
  } catch (err) {
    throw classify(PIPELINE_STAGES.PARSE, err);
  }
  tracer.emit({
    ...base,
    level: 'debug',
    stage: PIPELINE_STAGES.PARSE,
    event: TRACER_STAGE_EVENTS.OK,
    data: { upstreamSourceUrls: upstream, data },
  });

  // 4. Validate
  throwIfAborted(token, PIPELINE_STAGES.VALIDATE);
  let errors: string[];
  try {
    errors = await deps.validate(task, data);
  } catch (err) {
    throw classify(PIPELINE_STAGES.VALIDATE, err);
  }
  if (errors.length > 0) {
    throw new StageError({
      kind: PostErrorKind.VALIDATION_FAILED,
      stage: PIPELINE_STAGES.VALIDATE,
      message: errors.join('; '),
    });
  }
  tracer.emit({
    ...base,
    level: 'debug',
    stage: PIPELINE_STAGES.VALIDATE,
    event: TRACER_STAGE_EVENTS.OK,
  });

  // ---- per-unit dispatch loop ----
  for (const unit of task.units) {
    if (TERMINAL_DONE.has(unit.status)) continue;
    throwIfAborted(token, PIPELINE_STAGES.DISPATCH);
    unit.status = NodeStatus.RUNNING;

    // 5. Gate (rate limit, keyed by the website's scope)
    const bucket = rateKey(site.rateLimitScope, task.websiteId, task.accountId);
    // eslint-disable-next-line no-await-in-loop
    const waitMs = await deps.rateLimiter.waitMs(
      bucket,
      site.minimumPostWaitInterval,
    );
    if (waitMs > 0) {
      const now = Date.now();
      if (task.parkedSince === undefined) task.parkedSince = now;
      // Cumulative-wait ceiling: on a busy shared bucket a steady stream of
      // other tasks can keep pushing nextAllowedAt out, starving this one. Cap
      // the total time a task may stay parked before failing it terminally so
      // it can't wait forever.
      if (now - task.parkedSince + waitMs > RATE_LIMIT_WAIT_CEILING_MS) {
        throw new StageError({
          kind: PostErrorKind.FATAL,
          stage: PIPELINE_STAGES.GATE,
          message: `rate-limit wait ceiling exceeded (parked ${Math.round(
            (now - task.parkedSince) / 1000,
          )}s)`,
        });
      }
      task.waitingUntil = now + waitMs;
      tracer.emit({
        ...base,
        level: 'info',
        stage: PIPELINE_STAGES.GATE,
        event: TRACER_RATE_EVENTS.WAIT,
        unitId: unit.id,
        data: { waitMs, bucket, scope: site.rateLimitScope },
      });
      unit.status = NodeStatus.QUEUED;
      throw new StageError({
        kind: PostErrorKind.RATE_LIMITED,
        stage: PIPELINE_STAGES.GATE,
        message: `rate-limited; wait ${waitMs}ms`,
        retryAfterMs: waitMs,
      });
    }

    // 6. Transform — convert/resize/thumbnail/verify into PostingFiles.
    let postingFiles: PostingFile[] = [];
    if (unit.kind === UnitKind.BATCH) {
      try {
        // eslint-disable-next-line no-await-in-loop
        postingFiles = await deps.processBatch(
          task,
          unit.fileIds,
          upstream,
          token,
        );
      } catch (err) {
        throw classify(PIPELINE_STAGES.TRANSFORM, err);
      }
      tracer.emit({
        ...base,
        level: 'info',
        stage: PIPELINE_STAGES.TRANSFORM,
        event: TRACER_FILE_EVENTS.PROCESSED,
        unitId: unit.id,
        data: { fileIds: unit.fileIds, count: postingFiles.length },
      });
    }

    // 7. Dispatch
    let result: RelayPostResult;
    try {
      if (unit.kind === UnitKind.BATCH) {
        const batchUnits = task.units.filter((u) => u.kind === UnitKind.BATCH);
        // eslint-disable-next-line no-await-in-loop
        result = await deps.dispatchFile(site, data, postingFiles, token, {
          index: unit.ordinal,
          totalBatches: batchUnits.length,
        });
      } else {
        // eslint-disable-next-line no-await-in-loop
        result = await deps.dispatchMessage(site, data, token);
      }
    } catch (err) {
      const classified =
        err instanceof StageError
          ? err
          : classify(PIPELINE_STAGES.DISPATCH, err);
      // Fail closed on uncertain-dispatch outcomes (timeout/reset/abort style)
      // to avoid duplicate posts from automatic retries.
      const se =
        classified.kind === PostErrorKind.TRANSIENT &&
        isDeliveryUncertainError(err)
          ? new StageError({
              kind: PostErrorKind.FATAL,
              stage: PIPELINE_STAGES.DISPATCH,
              message: `delivery uncertain; retries disabled to prevent duplicates: ${classified.message}`,
              additionalInfo: {
                retryPolicy: 'fail_closed_on_dispatch_uncertainty',
                originalKind: classified.kind,
              },
              cause: err,
            })
          : classified;
      unit.status = NodeStatus.FAILED;
      unit.error = toTaskError(se);
      tracer.emit({
        ...base,
        level: 'error',
        stage: PIPELINE_STAGES.DISPATCH,
        event: TRACER_FILE_EVENTS.UNIT_FAILED,
        unitId: unit.id,
        data: { kind: se.kind, message: se.message },
      });
      throw se;
    }

    // 8. Capture
    // eslint-disable-next-line no-await-in-loop
    await deps.rateLimiter.markPosted(bucket);
    unit.sourceUrl = result.sourceUrl;
    unit.status = NodeStatus.SUCCEEDED;
    unit.error = undefined;
    task.waitingUntil = undefined;
    task.parkedSince = undefined;
    if (!task.sourceUrl && result.sourceUrl) task.sourceUrl = result.sourceUrl;
    tracer.emit({
      ...base,
      level: 'info',
      stage: PIPELINE_STAGES.CAPTURE,
      event: TRACER_FILE_EVENTS.UNIT_POSTED,
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
    stage: PIPELINE_STAGES.SETTLE,
    event: TRACER_TASK_EVENTS.SUCCEEDED,
    data: { sourceUrl: task.sourceUrl },
  });
}
