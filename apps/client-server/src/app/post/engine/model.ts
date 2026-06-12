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

const ALLOWED_TRANSITIONS: Record<NodeStatus, ReadonlySet<NodeStatus>> = {
  [NodeStatus.QUEUED]: new Set([
    NodeStatus.READY,
    NodeStatus.RUNNING,
    NodeStatus.CANCELLED,
    NodeStatus.SKIPPED,
  ]),
  [NodeStatus.READY]: new Set([
    NodeStatus.RUNNING,
    NodeStatus.WAITING,
    NodeStatus.CANCELLED,
    NodeStatus.SKIPPED,
  ]),
  [NodeStatus.RUNNING]: new Set([
    NodeStatus.SUCCEEDED,
    NodeStatus.FAILED,
    NodeStatus.WAITING,
    NodeStatus.CANCELLED,
  ]),
  [NodeStatus.WAITING]: new Set([
    NodeStatus.READY,
    NodeStatus.RUNNING,
    NodeStatus.CANCELLED,
  ]),
  [NodeStatus.SUCCEEDED]: new Set([NodeStatus.QUEUED]),
  [NodeStatus.FAILED]: new Set([NodeStatus.QUEUED]),
  [NodeStatus.SKIPPED]: new Set([NodeStatus.QUEUED]),
  [NodeStatus.CANCELLED]: new Set([NodeStatus.QUEUED]),
};

export function canTransition(from: NodeStatus, to: NodeStatus): boolean {
  if (from === to) return true;
  return ALLOWED_TRANSITIONS[from]?.has(to) ?? false;
}

// ---------------------------------------------------------------------------
// Working-tree nodes
// ---------------------------------------------------------------------------

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

export class RelayJob {
  id: EntityId;
  submissionId: EntityId;
  attemptOf?: EntityId;
  resumeMode: PostRecordResumeMode;
  status: NodeStatus;
  priority: number;
  scheduledFor?: number;
  createdAt: number;
  completedAt?: number;
  tasks: RelayTask[];

  constructor(init: {
    id?: EntityId;
    submissionId: EntityId;
    resumeMode?: PostRecordResumeMode;
    priority?: number;
    scheduledFor?: number;
    attemptOf?: EntityId;
  }) {
    this.id = init.id ?? v4();
    this.submissionId = init.submissionId;
    this.resumeMode = init.resumeMode ?? PostRecordResumeMode.NEW;
    this.priority = init.priority ?? 0;
    this.scheduledFor = init.scheduledFor;
    this.attemptOf = init.attemptOf;
    this.status = NodeStatus.QUEUED;
    this.createdAt = Date.now();
    this.tasks = [];
  }
}

// ---------------------------------------------------------------------------
// Derived state
// ---------------------------------------------------------------------------

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
  if (!dep || dep.tasks.length === 0) return 'none';

  const deps = dep.tasks
    .map((id) => job.tasks.find((t) => t.id === id))
    .filter((t): t is RelayTask => !!t);
  if (deps.length === 0) return 'none';

  const succeeded = deps.filter((t) => t.status === NodeStatus.SUCCEEDED).length;
  const skipped = deps.filter((t) => t.status === NodeStatus.SKIPPED).length;
  const terminal = deps.filter((t) => TERMINAL_ALL.has(t.status)).length;
  const total = deps.length;

  if (dep.mode === 'all') {
    if (succeeded + skipped === total) return 'satisfied';
    const terminalNotDone = terminal - succeeded - skipped;
    if (terminalNotDone > 0) return 'blocked';
    return 'pending';
  }

  const need = dep.mode === 'count' ? dep.n : 1; // 'any' === count 1
  if (succeeded >= need) return 'satisfied';
  const stillPossible = total - (terminal - succeeded);
  if (stillPossible < need) return 'blocked';
  return 'pending';
}
