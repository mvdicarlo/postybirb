/**
 * Relay engine — staged pipeline (runs one task pass).
 *
 *   Resolve -> Authenticate -> Parse -> Validate -> Plan
 *        -> [ per unit: Transform -> Gate -> Dispatch -> Capture ]
 *        -> Settle
 *
 * Each stage emits a trace line and short-circuits with a typed StageError.
 * Rate-limit gating is expected control flow, not a failure: instead of
 * throwing, the pass returns a `rate_limited` outcome so the scheduler parks
 * the task in WAITING and resumes the pass without re-posting completed units.
 * Only genuine failures throw a StageError.
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
  depTaskIds,
  isDone,
} from './model';
import { RateLimiter, rateKey } from './rate-limiter';
import { RelayTracer, taskTraceFields } from './tracer.service';
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

/**
 * Outcome of a single {@link runTaskPass}. A pass either runs the task to
 * completion (every non-done unit dispatched) or stops early because a unit hit
 * a rate-limit gate and the task must be parked in WAITING. Genuine failures
 * are signalled by a thrown {@link StageError}, never by this result.
 */
export type TaskPassResult =
  | { outcome: 'completed' }
  | { outcome: 'rate_limited'; retryAfterMs: number };

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

/**
 * Build the job's task/unit tree from its submission. Runs in two phases:
 *
 *  1. For every selected (website, account) option, create a RelayTask.
 *     Unsupported pairings (e.g. message submission on a file-only site) and
 *     file submissions with every file excluded are immediately marked
 *     SKIPPED. File tasks are sharded into BATCH units of `fileBatchSize`;
 *     message tasks get one MESSAGE unit.
 *
 *  2. Wire source-URL dependencies. Sites that accept external source URLs
 *     (think: cross-poster bookmark sites) declare a dependency on every
 *     "standard" site so they post after them and can quote their URLs. The
 *     mode (ALL/ANY/COUNT) decides how many upstreams must be done first;
 *     COUNT is clamped to the actual upstream count to stay satisfiable.
 */
export function planJob(job: RelayJob, deps: PipelineDeps): void {
  const submission = deps.getSubmission(job.id);
  for (const opt of submission.options) {
    const site = deps.getWebsite(job.id, opt.websiteId, opt.accountId);
    job.tasks.push(buildTask(job, opt, site, submission));
  }
  wireSourceDependencies(job, deps);
}

/**
 * Shard a file submission's files into ordered BATCH units of `batchSize`,
 * pushing them onto the task. Files excluded for this account are filtered out
 * upstream by {@link buildTask}.
 */
function shardFilesIntoUnits(
  task: RelayTask,
  files: RelaySubmission['files'],
  batchSize: number,
): void {
  let ordinal = 0;
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
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

/**
 * Create the RelayTask for one (website, account) option and populate its
 * units. Unsupported pairings (e.g. a message submission on a file-only site)
 * and file submissions with every file excluded are returned already-SKIPPED
 * with no units; file tasks are sharded into BATCH units and message tasks get
 * a single MESSAGE unit.
 */
function buildTask(
  job: RelayJob,
  opt: { accountId: string; websiteId: string },
  site: RelayWebsite,
  submission: RelaySubmission,
): RelayTask {
  const task = new RelayTask({
    id: `${job.id}:t:${opt.websiteId}:${opt.accountId}`,
    jobId: job.id,
    accountId: opt.accountId,
    websiteId: opt.websiteId,
    idempotencyKey: `${job.id}:${opt.websiteId}:${opt.accountId}`,
  });

  const supports =
    submission.type === SubmissionType.FILE
      ? site.supportsFile
      : site.supportsMessage;
  if (!supports) {
    task.status = NodeStatus.SKIPPED;
    return task;
  }

  if (submission.type === SubmissionType.FILE) {
    const files = submission.files
      .filter((f) => !f.ignoredWebsites?.includes(opt.accountId))
      .sort((a, b) => a.order - b.order);
    if (files.length === 0) {
      task.status = NodeStatus.SKIPPED;
    } else {
      shardFilesIntoUnits(task, files, site.fileBatchSize);
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

  return task;
}

/** Build the source-URL dependency gate for an external-source site. */
function buildSourceDependency(
  mode: RelayWebsite['sourceDependencyMode'],
  standardIds: string[],
): Dependency {
  if (mode === SOURCE_DEPENDENCY_MODES.ALL) {
    return { mode: SOURCE_DEPENDENCY_MODES.ALL, tasks: standardIds };
  }
  if (mode === SOURCE_DEPENDENCY_MODES.ANY) {
    return { mode: SOURCE_DEPENDENCY_MODES.ANY, tasks: standardIds };
  }
  return {
    mode: SOURCE_DEPENDENCY_MODES.COUNT,
    tasks: standardIds,
    n: Math.min(mode.count, standardIds.length),
  };
}

/**
 * Wire source-URL dependencies: sites that accept external source URLs depend
 * on every "standard" (non-external-source) task so they post afterwards and
 * can quote their source URLs. The mode (ALL/ANY/COUNT) decides how many
 * upstreams must be done first; COUNT is clamped to the upstream count by
 * {@link buildSourceDependency} to stay satisfiable.
 */
function wireSourceDependencies(job: RelayJob, deps: PipelineDeps): void {
  const standardIds = job.tasks
    .filter(
      (t) =>
        t.status !== NodeStatus.SKIPPED &&
        !deps.getWebsite(job.id, t.websiteId, t.accountId)
          .acceptsExternalSourceUrls,
    )
    .map((t) => t.id);
  if (standardIds.length === 0) return;

  for (const t of job.tasks) {
    if (t.status === NodeStatus.SKIPPED) continue;
    const site = deps.getWebsite(job.id, t.websiteId, t.accountId);
    if (!site.acceptsExternalSourceUrls) continue;
    t.dependency = buildSourceDependency(site.sourceDependencyMode, standardIds);
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
      } else if (!isDone(unit)) {
        unit.status = NodeStatus.QUEUED;
        unit.error = undefined;
      }
      if (!isDone(unit)) hasWork = true;
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
  for (const depId of depTaskIds(task)) {
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
  for (const unit of task.units) {
    if (isDone(unit)) continue;
    throwIfAborted(token, PIPELINE_STAGES.DISPATCH);
    unit.status = NodeStatus.RUNNING;

    const bucket = rateKey(site.rateLimitScope, task.websiteId, task.accountId);

    // 5. Gate (rate limit). A positive wait means park the whole task.
    // eslint-disable-next-line no-await-in-loop
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
    // eslint-disable-next-line no-await-in-loop
    const postingFiles = await transformUnit(
      deps,
      task,
      unit,
      upstream,
      token,
      base,
    );

    // 7. Dispatch
    // eslint-disable-next-line no-await-in-loop
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
    // eslint-disable-next-line no-await-in-loop
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
