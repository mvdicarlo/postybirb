/**
 * Relay engine — staged task pass.
 *
 *   Resolve -> Authenticate -> Parse -> Validate
 *        -> [ per unit: Gate -> Transform -> Dispatch -> Capture ]
 *        -> Settle
 *
 * Each stage emits a trace line and short-circuits with a typed StageError.
 * Rate-limit gating is expected control flow, not a failure: instead of
 * throwing, the pass returns a `rate_limited` outcome so the scheduler parks
 * the task in WAITING and resumes the pass without re-posting completed units.
 * Only genuine failures throw a StageError.
 *
 * The pass depends only on the abstract {@link PipelineDeps} seams so it is
 * unit-testable with mocks; the scheduler supplies production implementations.
 */

/* eslint-disable no-param-reassign */ // the pass mutates the job tree in place

import { NodeStatus, PostErrorKind, UnitKind } from '@postybirb/types';
import { CancellableToken } from '../models/cancellable-token';
import { PostingFile } from '../models/posting-file';
import {
    PIPELINE_STAGES,
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
import { RelayJob, RelayTask, RelayUnit, isDone } from './model';
import {
    PipelineDeps,
    RelayDispatchData,
    TaskPassResult,
} from './pipeline-deps.interface';
import { rateKey } from './rate-limiter';
import { taskTraceFields } from './tracer.service';
import { RelayPostResult, RelayWebsite } from './websites';

/**
 * Maximum cumulative time a single task may stay parked on rate-limit gates in
 * one run before it is failed terminally. Prevents shared-bucket starvation.
 */
const RATE_LIMIT_WAIT_CEILING_MS = 60 * 60 * 1000; // 1 hour

function throwIfAborted(token: CancellableToken, stage: string): void {
  if (token.isCancelled) {
    throw new StageError({
      kind: PostErrorKind.FATAL,
      stage,
      message: 'cancelled',
    });
  }
}

/**
 * Run a stage's async body, normalizing any thrown value into a StageError
 * tagged with the stage (network/IO blips become TRANSIENT, everything else
 * FATAL). Keeps each stage call site to a single readable line instead of a
 * repeated try/catch + classify block.
 */
async function runStage<T>(stage: string, body: () => Promise<T>): Promise<T> {
  try {
    return await body();
  } catch (err) {
    throw classify(stage, err);
  }
}

function collectUpstreamSourceUrls(job: RelayJob, task: RelayTask): string[] {
  const urls: string[] = [];
  for (const depId of task.dependencyTaskIds) {
    const dep = job.tasks.find((t) => t.id === depId);
    if (dep?.sourceUrl) urls.push(dep.sourceUrl);
  }
  return urls;
}

/** Shared trace fields for a (job, task) pair, threaded through the stages. */
type TraceBase = ReturnType<typeof taskTraceFields>;

/**
 * Gate stage: ask the rate limiter how long this unit must wait. Returns 0 when
 * the unit may post immediately. A positive return means the task must park:
 * the park bookkeeping (parkedSince/waitingUntil/QUEUED + trace) is done here
 * and the caller returns a `rate_limited` outcome. Throws FATAL if the task has
 * cumulatively parked past {@link RATE_LIMIT_WAIT_CEILING_MS} on a busy shared
 * bucket (anti-starvation).
 */
async function gateUnit(
  deps: PipelineDeps,
  site: RelayWebsite,
  task: RelayTask,
  unit: RelayUnit,
  bucket: string,
  base: TraceBase,
): Promise<number> {
  const waitMs = await deps.rateLimiter.waitMs(
    bucket,
    site.minimumPostWaitInterval,
  );
  if (waitMs <= 0) return 0;

  const now = Date.now();
  if (task.parkedSince === undefined) task.parkedSince = now;
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
  deps.tracer.emit({
    ...base,
    level: 'info',
    stage: PIPELINE_STAGES.GATE,
    event: TRACER_RATE_EVENTS.WAIT,
    unitId: unit.id,
    data: { waitMs, bucket, scope: site.rateLimitScope },
  });
  unit.status = NodeStatus.QUEUED;
  return waitMs;
}

/**
 * Transform stage: convert/resize/thumbnail/verify a BATCH unit's files into
 * ready-to-post PostingFiles. Message units have no files, so an empty list is
 * returned without touching the file processor.
 */
async function transformUnit(
  deps: PipelineDeps,
  task: RelayTask,
  unit: RelayUnit,
  upstream: string[],
  token: CancellableToken,
  base: TraceBase,
): Promise<PostingFile[]> {
  if (unit.kind !== UnitKind.BATCH) return [];
  const postingFiles = await runStage(PIPELINE_STAGES.TRANSFORM, () =>
    deps.processBatch(task, unit.fileIds, upstream, token),
  );
  deps.tracer.emit({
    ...base,
    level: 'info',
    stage: PIPELINE_STAGES.TRANSFORM,
    event: TRACER_FILE_EVENTS.PROCESSED,
    unitId: unit.id,
    data: { fileIds: unit.fileIds, count: postingFiles.length },
  });
  return postingFiles;
}

/**
 * Re-tag a dispatch error as fail-closed when delivery is uncertain. A
 * TRANSIENT error whose shape implies the remote may have accepted the post
 * (timeout/reset/abort) is converted to FATAL so the retry policy will NOT
 * re-dispatch and risk a duplicate post; all other errors pass through
 * unchanged.
 */
function failClosedIfUncertain(
  classified: StageError,
  err: unknown,
): StageError {
  if (
    classified.kind !== PostErrorKind.TRANSIENT ||
    !isDeliveryUncertainError(err)
  ) {
    return classified;
  }
  return new StageError({
    kind: PostErrorKind.FATAL,
    stage: PIPELINE_STAGES.DISPATCH,
    message: `delivery uncertain; retries disabled to prevent duplicates: ${classified.message}`,
    additionalInfo: {
      retryPolicy: 'fail_closed_on_dispatch_uncertainty',
      originalKind: classified.kind,
    },
    cause: err,
  });
}

/**
 * Dispatch stage: send a BATCH (file) or MESSAGE unit to the website. On
 * failure the unit is marked FAILED, a fail-closed-on-uncertain-delivery
 * StageError is built, traced, and rethrown for the scheduler's retry policy.
 */
async function dispatchUnit(
  deps: PipelineDeps,
  site: RelayWebsite,
  data: RelayDispatchData,
  task: RelayTask,
  unit: RelayUnit,
  postingFiles: PostingFile[],
  token: CancellableToken,
  base: TraceBase,
): Promise<RelayPostResult> {
  try {
    if (unit.kind === UnitKind.BATCH) {
      const totalBatches = task.units.filter(
        (u) => u.kind === UnitKind.BATCH,
      ).length;
      return await deps.dispatchFile(site, data, postingFiles, token, {
        index: unit.ordinal,
        totalBatches,
      });
    }
    return await deps.dispatchMessage(site, data, token);
  } catch (err) {
    const classified =
      err instanceof StageError ? err : classify(PIPELINE_STAGES.DISPATCH, err);
    const se = failClosedIfUncertain(classified, err);
    unit.status = NodeStatus.FAILED;
    unit.error = toTaskError(se);
    deps.tracer.emit({
      ...base,
      level: 'error',
      stage: PIPELINE_STAGES.DISPATCH,
      event: TRACER_FILE_EVENTS.UNIT_FAILED,
      unitId: unit.id,
      data: { kind: se.kind, message: se.message },
    });
    throw se;
  }
}

/**
 * Capture stage: record a successful dispatch. Marks the rate-limit bucket
 * posted, transitions the unit to SUCCEEDED, clears the task's wait/park state,
 * promotes the first source URL onto the task, and pushes a UI delta.
 */
async function captureUnit(
  deps: PipelineDeps,
  job: RelayJob,
  task: RelayTask,
  unit: RelayUnit,
  result: RelayPostResult,
  bucket: string,
  base: TraceBase,
): Promise<void> {
  await deps.rateLimiter.markPosted(bucket);
  unit.sourceUrl = result.sourceUrl;
  unit.status = NodeStatus.SUCCEEDED;
  unit.error = undefined;
  task.waitingUntil = undefined;
  task.parkedSince = undefined;
  if (!task.sourceUrl && result.sourceUrl) task.sourceUrl = result.sourceUrl;
  deps.tracer.emit({
    ...base,
    level: 'info',
    stage: PIPELINE_STAGES.CAPTURE,
    event: TRACER_FILE_EVENTS.UNIT_POSTED,
    unitId: unit.id,
    data: { sourceUrl: result.sourceUrl, message: result.message },
  });
  deps.tracer.pushTaskDelta(job, task);
}

/**
 * Run a single pass of the pipeline for one task. Returns a {@link
 * TaskPassResult}: `completed` when the task ran to the end, or `rate_limited`
 * when a unit hit a rate-limit gate and the task should be parked in WAITING.
 * Throws StageError only on a genuine failure. Idempotent w.r.t. already-
 * SUCCEEDED units.
 */
export async function runTaskPass(
  deps: PipelineDeps,
  job: RelayJob,
  task: RelayTask,
  token: CancellableToken,
): Promise<TaskPassResult> {
  const { tracer } = deps;
  const base = taskTraceFields(job, task);

  /** Emit the standard "stage completed OK" debug trace line. */
  const emitStageOk = (
    stage: string,
    data?: Record<string, unknown>,
  ): void => {
    tracer.emit({
      ...base,
      level: 'debug',
      stage,
      event: TRACER_STAGE_EVENTS.OK,
      data,
    });
  };

  // 1. Resolve
  throwIfAborted(token, PIPELINE_STAGES.RESOLVE);
  const site = deps.getWebsite(job.id, task.websiteId, task.accountId);
  emitStageOk(PIPELINE_STAGES.RESOLVE);

  // 2. Authenticate — ensure the account session is live (re-login if expired).
  throwIfAborted(token, PIPELINE_STAGES.AUTHENTICATE);
  await runStage(PIPELINE_STAGES.AUTHENTICATE, () =>
    Promise.resolve(deps.authenticate?.(task)),
  );
  emitStageOk(PIPELINE_STAGES.AUTHENTICATE);

  // 3. Parse — build post data and inject upstream source URLs.
  throwIfAborted(token, PIPELINE_STAGES.PARSE);
  const upstream = collectUpstreamSourceUrls(job, task);
  const data = await runStage(PIPELINE_STAGES.PARSE, () =>
    deps.buildPostData(task, upstream),
  );
  emitStageOk(PIPELINE_STAGES.PARSE, { upstreamSourceUrls: upstream, data });

  // 4. Validate
  throwIfAborted(token, PIPELINE_STAGES.VALIDATE);
  const errors = await runStage(PIPELINE_STAGES.VALIDATE, () =>
    deps.validate(task, data),
  );
  if (errors.length > 0) {
    throw new StageError({
      kind: PostErrorKind.VALIDATION_FAILED,
      stage: PIPELINE_STAGES.VALIDATE,
      message: errors.join('; '),
    });
  }
  emitStageOk(PIPELINE_STAGES.VALIDATE);

  // ---- per-unit dispatch loop ----
  // Dispatch batches strictly in ascending ordinal order (batch 0, then 1, then
  // 2, …) so a multi-batch post always goes out in sequence — even after a
  // resume/recovery that reloaded the units in some other order.
  const orderedUnits = [...task.units].sort((a, b) => a.ordinal - b.ordinal);
  for (const unit of orderedUnits) {
    if (isDone(unit)) continue;
    throwIfAborted(token, PIPELINE_STAGES.DISPATCH);
    unit.status = NodeStatus.RUNNING;

    const bucket = rateKey(site.rateLimitScope, task.websiteId, task.accountId);

    // 5. Gate (rate limit). A positive wait means park the whole task.
    const waitMs = await gateUnit(deps, site, task, unit, bucket, base);
    if (waitMs > 0) {
      // Parking is expected control flow, not a failure: returning a
      // `rate_limited` outcome tells the scheduler to park the task in WAITING
      // until `retryAfterMs`, then resume the pass. Because already-SUCCEEDED
      // units are skipped on the next pass we never re-post a batch that
      // already went out.
      return { outcome: 'rate_limited', retryAfterMs: waitMs };
    }

    // 6. Transform — convert/resize/thumbnail/verify into PostingFiles.
    const postingFiles = await transformUnit(
      deps,
      task,
      unit,
      upstream,
      token,
      base,
    );

    // 7. Dispatch
    const result = await dispatchUnit(
      deps,
      site,
      data,
      task,
      unit,
      postingFiles,
      token,
      base,
    );

    // 8. Capture
    await captureUnit(deps, job, task, unit, result, bucket, base);
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
  return { outcome: 'completed' };
}
