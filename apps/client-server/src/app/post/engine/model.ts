/**
 * Relay engine — in-memory job-tree working model + state machine.
 *
 * These are the runtime structures the scheduler/pipeline operate on. They
 * mirror the persisted entity shapes (IPostJob/IPostTask/IPostUnit in
 * @postybirb/types) so PR #4 can map them 1:1 to PostJob/PostTask/PostUnit
 * database entities. Named with a `Relay` prefix to avoid colliding with the
 * DB entity classes.
 */

/* eslint-disable max-classes-per-file */
import {
    AccountId,
    Dependency,
    EntityId,
    ITaskError,
    NodeStatus,
    PostRecordResumeMode,
    SubmissionFileId,
    UnitKind,
} from '@postybirb/types';
import { v4 } from 'uuid';
import { DEPENDENCY_STATES, SOURCE_DEPENDENCY_MODES } from './constants';

// ---------------------------------------------------------------------------
// State machine
// ---------------------------------------------------------------------------

/** Statuses that mean "do not run again on resume". */
export const TERMINAL_DONE: ReadonlySet<NodeStatus> = new Set([
  NodeStatus.SUCCEEDED,
  NodeStatus.SKIPPED,
]);

/** Statuses that mean "fully finished" (no more work). */
export const TERMINAL_ALL: ReadonlySet<NodeStatus> = new Set([
  NodeStatus.SUCCEEDED,
  NodeStatus.SKIPPED,
  NodeStatus.FAILED,
  NodeStatus.CANCELLED,
]);

/** A status, or any node (job/task/unit) that carries one. */
type StatusLike = NodeStatus | { status: NodeStatus };

function statusOf(value: StatusLike): NodeStatus {
  return typeof value === 'string' ? value : value.status;
}

/**
 * True when a node has reached a fully-terminal state (succeeded, skipped,
 * failed or cancelled) — there is no further work to do for it.
 */
export function isTerminal(value: StatusLike): boolean {
  return TERMINAL_ALL.has(statusOf(value));
}

/**
 * True when a node is "done" for resume purposes (succeeded or skipped) and so
 * must not be re-run on a CONTINUE resume.
 */
export function isDone(value: StatusLike): boolean {
  return TERMINAL_DONE.has(statusOf(value));
}

// ---------------------------------------------------------------------------
// Working-tree nodes
// ---------------------------------------------------------------------------

/**
 * Smallest unit of dispatchable work inside a task: either one file batch
 * (a single onPostFileSubmission call carrying `fileBatchSize` files) or the
 * one-shot message body for a message website. A task may own many BATCH
 * units when a file submission is sharded across multiple posts; message
 * tasks always have exactly one MESSAGE unit.
 *
 * Units own their own status so a partial failure mid-task (e.g. batch 2 of 4
 * is rate-limited or errors) can be resumed without re-posting the batches
 * that already succeeded — the cornerstone of the engine's idempotency.
 */
export class RelayUnit {
  id: EntityId;
  taskId: EntityId;
  kind: UnitKind;
  ordinal: number;
  status: NodeStatus;
  fileIds: SubmissionFileId[];
  sourceUrl?: string;
  error?: ITaskError;

  constructor(init: {
    id?: EntityId;
    taskId: EntityId;
    kind: UnitKind;
    ordinal: number;
    fileIds?: SubmissionFileId[];
  }) {
    this.id = init.id ?? v4();
    this.taskId = init.taskId;
    this.kind = init.kind;
    this.ordinal = init.ordinal;
    this.status = NodeStatus.QUEUED;
    this.fileIds = init.fileIds ?? [];
  }
}

/**
 * A single (website, account) destination for a job. Carries the per-target
 * retry counter, optional dependency gate (e.g. "wait for the standard sites
 * to post first so you can quote their source URLs"), and the ordered list
 * of units that physically dispatch the work. The task's own `status` is the
 * roll-up the scheduler reads when deciding what to run next.
 */
export class RelayTask {
  id: EntityId;
  jobId: EntityId;
  accountId: AccountId;
  websiteId: string;
  dependency?: Dependency;
  status: NodeStatus;
  attempts: number;
  maxAttempts: number;
  idempotencyKey: string;
  sourceUrl?: string;
  message?: string;
  error?: ITaskError;
  waitingUntil?: number;
  /**
   * Wall-clock time (ms) at which this task first parked on a rate-limit gate
   * in the current run. Used to enforce a cumulative wait ceiling so a task on
   * a busy shared bucket cannot be starved indefinitely. In-memory only; reset
   * once the task makes forward progress (a unit posts).
   */
  parkedSince?: number;
  units: RelayUnit[];

  constructor(init: {
    id?: EntityId;
    jobId: EntityId;
    accountId: AccountId;
    websiteId: string;
    idempotencyKey: string;
    dependency?: Dependency;
    maxAttempts?: number;
  }) {
    this.id = init.id ?? v4();
    this.jobId = init.jobId;
    this.accountId = init.accountId;
    this.websiteId = init.websiteId;
    this.idempotencyKey = init.idempotencyKey;
    this.dependency = init.dependency;
    this.status = NodeStatus.QUEUED;
    this.attempts = 0;
    this.maxAttempts = init.maxAttempts ?? 3;
    this.units = [];
  }
}

/**
 * Top-level unit of work tracked by the scheduler: one posting attempt of one
 * submission. Owns the full tree of tasks/units that materialize the post and
 * carries the resume mode that controls how a re-run treats previously-
 * succeeded units.
 */
export class RelayJob {
  id: EntityId;
  submissionId: EntityId;
  attemptOf?: EntityId;
  resumeMode: PostRecordResumeMode;
  status: NodeStatus;
  createdAt: number;
  completedAt?: number;
  tasks: RelayTask[];

  constructor(init: {
    id?: EntityId;
    submissionId: EntityId;
    resumeMode?: PostRecordResumeMode;
    attemptOf?: EntityId;
  }) {
    this.id = init.id ?? v4();
    this.submissionId = init.submissionId;
    this.resumeMode = init.resumeMode ?? PostRecordResumeMode.NEW;
    this.attemptOf = init.attemptOf;
    this.status = NodeStatus.QUEUED;
    this.createdAt = Date.now();
    this.tasks = [];
  }
}

// ---------------------------------------------------------------------------
// Derived state
// ---------------------------------------------------------------------------

/**
 * Roll up the task statuses into the job's effective status. The order of
 * checks below encodes a priority — earlier branches win:
 *  1. RUNNING wins so the UI shows live progress as long as anything is on
 *     the wire.
 *  2. WAITING surfaces "parked on a rate-limit/dependency gate" even when
 *     other tasks are still queued, so the UI can show a wait countdown.
 *  3. QUEUED/READY ⇒ RUNNING: from the user's perspective there's still
 *     active work to do, even if no task happens to be mid-dispatch right now.
 *  4. Any FAILED ⇒ the whole job is FAILED (one bad website fails the post).
 *  5. CANCELLED only wins if *every* task was cancelled; a mix of cancelled +
 *     succeeded is reported as SUCCEEDED so a single late cancel can't mask a
 *     post that already went out.
 *  6. Default: SUCCEEDED (only SUCCEEDED + SKIPPED remain).
 */
export function computeJobStatus(job: RelayJob): NodeStatus {
  const statuses = job.tasks.map((t) => t.status);
  if (statuses.length === 0) return NodeStatus.SUCCEEDED;
  if (statuses.some((s) => s === NodeStatus.RUNNING)) return NodeStatus.RUNNING;
  if (statuses.some((s) => s === NodeStatus.WAITING)) return NodeStatus.WAITING;
  if (statuses.some((s) => s === NodeStatus.QUEUED || s === NodeStatus.READY)) {
    return NodeStatus.RUNNING;
  }
  if (statuses.some((s) => s === NodeStatus.FAILED)) return NodeStatus.FAILED;
  if (statuses.every((s) => s === NodeStatus.CANCELLED)) {
    return NodeStatus.CANCELLED;
  }
  return NodeStatus.SUCCEEDED;
}

// ---------------------------------------------------------------------------
// Dependency evaluation
// ---------------------------------------------------------------------------

export function depTaskIds(task: RelayTask): EntityId[] {
  return task.dependency?.tasks ?? [];
}

export type DependencyState = 'none' | 'satisfied' | 'pending' | 'blocked';

/**
 * Evaluate a task's source-URL dependency gate against the current tree.
 *  - 'none'      : no dependency declared.
 *  - 'satisfied' : the gate is met; the task may run.
 *  - 'pending'   : not yet met, but still reachable.
 *  - 'blocked'   : can never be met -> the task should be SKIPPED.
 *
 * SKIPPED upstreams count as "done" for 'all' but not as a success for
 * 'any'/'count'.
 */
export function evaluateDependency(
  job: RelayJob,
  task: RelayTask,
): DependencyState {
  const dep = task.dependency;
  if (!dep || dep.tasks.length === 0) return DEPENDENCY_STATES.NONE;

  const deps = dep.tasks
    .map((id) => job.tasks.find((t) => t.id === id))
    .filter((t): t is RelayTask => !!t);
  if (deps.length === 0) return DEPENDENCY_STATES.NONE;

  const succeeded = deps.filter((t) => t.status === NodeStatus.SUCCEEDED).length;
  const skipped = deps.filter((t) => t.status === NodeStatus.SKIPPED).length;
  const terminal = deps.filter((t) => isTerminal(t)).length;
  const total = deps.length;

  if (dep.mode === SOURCE_DEPENDENCY_MODES.ALL) {
    if (succeeded + skipped === total) return DEPENDENCY_STATES.SATISFIED;
    const terminalNotDone = terminal - succeeded - skipped;
    if (terminalNotDone > 0) return DEPENDENCY_STATES.BLOCKED;
    return DEPENDENCY_STATES.PENDING;
  }

  const need = dep.mode === SOURCE_DEPENDENCY_MODES.COUNT ? dep.n : 1; // 'any' === count 1
  if (succeeded >= need) return DEPENDENCY_STATES.SATISFIED;
  const stillPossible = total - (terminal - succeeded);
  if (stillPossible < need) return DEPENDENCY_STATES.BLOCKED;
  return DEPENDENCY_STATES.PENDING;
}
