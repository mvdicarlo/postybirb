/**
 * Relay posting framework — Job Tree model + state machine.
 *
 * The job tree IS the state. Resume = re-run any node not in a terminal
 * "done" state ({SUCCEEDED, SKIPPED}). No event replay required.
 *
 * Written in "erasable" TypeScript so it runs directly under
 * `node --experimental-strip-types` (no enums, no parameter properties).
 */

// ---------------------------------------------------------------------------
// Identifiers
// ---------------------------------------------------------------------------

export type JobId = string;
export type TaskId = string;
export type UnitId = string;
export type AccountId = string;
export type WebsiteId = string;
export type FileId = string;
export type SubmissionId = string;

// ---------------------------------------------------------------------------
// Node lifecycle state machine
// ---------------------------------------------------------------------------

export const NodeStatus = {
  QUEUED: 'QUEUED',
  READY: 'READY',
  RUNNING: 'RUNNING',
  WAITING: 'WAITING', // rate-limit or dependency gate
  SUCCEEDED: 'SUCCEEDED',
  FAILED: 'FAILED',
  SKIPPED: 'SKIPPED',
  CANCELLED: 'CANCELLED',
} as const;
export type NodeStatus = (typeof NodeStatus)[keyof typeof NodeStatus];

/** Statuses that mean "do not run again on resume". */
export const TERMINAL_DONE: ReadonlySet<NodeStatus> = new Set([
  NodeStatus.SUCCEEDED,
  NodeStatus.SKIPPED,
]);

/** Statuses that mean "fully finished" (no more work, success or not). */
export const TERMINAL_ALL: ReadonlySet<NodeStatus> = new Set([
  NodeStatus.SUCCEEDED,
  NodeStatus.SKIPPED,
  NodeStatus.FAILED,
  NodeStatus.CANCELLED,
]);

const ALLOWED_TRANSITIONS: Record<NodeStatus, ReadonlySet<NodeStatus>> = {
  QUEUED: new Set([NodeStatus.READY, NodeStatus.CANCELLED, NodeStatus.SKIPPED]),
  READY: new Set([
    NodeStatus.RUNNING,
    NodeStatus.WAITING,
    NodeStatus.CANCELLED,
    NodeStatus.SKIPPED,
  ]),
  RUNNING: new Set([
    NodeStatus.SUCCEEDED,
    NodeStatus.FAILED,
    NodeStatus.WAITING,
    NodeStatus.CANCELLED,
  ]),
  WAITING: new Set([NodeStatus.READY, NodeStatus.CANCELLED]),
  // Terminal states are re-openable only by the resume planner (-> QUEUED).
  SUCCEEDED: new Set([NodeStatus.QUEUED]),
  FAILED: new Set([NodeStatus.QUEUED]),
  SKIPPED: new Set([NodeStatus.QUEUED]),
  CANCELLED: new Set([NodeStatus.QUEUED]),
};

export function canTransition(from: NodeStatus, to: NodeStatus): boolean {
  if (from === to) return true;
  return ALLOWED_TRANSITIONS[from]?.has(to) ?? false;
}

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

export const SubmissionType = {
  FILE: 'FILE',
  MESSAGE: 'MESSAGE',
} as const;
export type SubmissionType = (typeof SubmissionType)[keyof typeof SubmissionType];

export const ResumeMode = {
  NEW: 'NEW', // fresh tree
  CONTINUE: 'CONTINUE', // re-run non-succeeded nodes
  RETRY: 'RETRY', // also re-run succeeded batch units (re-upload everything)
} as const;
export type ResumeMode = (typeof ResumeMode)[keyof typeof ResumeMode];

export type SourceFile = {
  id: FileId;
  fileName: string;
  mimeType: string;
  width: number;
  height: number;
  bytes: number;
  /** stable content hash used for the transform cache */
  hash: string;
  order: number;
  altText?: string;
  /** accounts the user excluded this file from */
  ignoredWebsites?: AccountId[];
  /** per-account (or 'default') user dimension overrides */
  dimensionOverrides?: Record<string, { width?: number; height?: number }>;
};

export type WebsiteOption = {
  accountId: AccountId;
  websiteId: WebsiteId;
  title: string;
  description: string;
  tags: string[];
};

export type Submission = {
  id: SubmissionId;
  type: SubmissionType;
  title: string;
  files: SourceFile[]; // empty for MESSAGE
  options: WebsiteOption[];
};

// ---------------------------------------------------------------------------
// Job tree nodes
// ---------------------------------------------------------------------------

export const UnitKind = {
  BATCH: 'BATCH', // a batch of files for a file website
  MESSAGE: 'MESSAGE',
} as const;
export type UnitKind = (typeof UnitKind)[keyof typeof UnitKind];

export type TaskError = {
  kind: string;
  stage: string;
  message: string;
  retryable: boolean;
  stack?: string;
};

export class Unit {
  id: UnitId;
  taskId: TaskId;
  kind: UnitKind;
  ordinal: number;
  status: NodeStatus;
  fileIds: FileId[];
  sourceUrl?: string;
  error?: TaskError;

  constructor(init: {
    id: UnitId;
    taskId: TaskId;
    kind: UnitKind;
    ordinal: number;
    fileIds?: FileId[];
  }) {
    this.id = init.id;
    this.taskId = init.taskId;
    this.kind = init.kind;
    this.ordinal = init.ordinal;
    this.status = NodeStatus.QUEUED;
    this.fileIds = init.fileIds ?? [];
  }
}

/**
 * How a task's source-URL dependency is satisfied:
 *  - 'all'   : every listed task must be terminal-done (SUCCEEDED/SKIPPED)
 *  - 'any'   : unblock as soon as >= 1 listed task SUCCEEDS (post sooner with
 *              whatever upstream URLs exist so far)
 *  - 'count' : unblock once >= n listed tasks SUCCEED
 *
 * A task with no dependency runs immediately.
 */
export type Dependency =
  | { mode: 'all'; tasks: TaskId[] }
  | { mode: 'any'; tasks: TaskId[] }
  | { mode: 'count'; tasks: TaskId[]; n: number };

export class WebsiteTask {
  id: TaskId;
  jobId: JobId;
  accountId: AccountId;
  websiteId: WebsiteId;
  /** source-url dependency gate (undefined = no dependency, runs immediately) */
  dependency?: Dependency;
  status: NodeStatus;
  attempts: number;
  maxAttempts: number;
  idempotencyKey: string;
  /** the canonical source URL produced by this task (post page) */
  sourceUrl?: string;
  message?: string;
  error?: TaskError;
  waitingUntil?: number; // epoch ms while WAITING
  units: Unit[];

  constructor(init: {
    id: TaskId;
    jobId: JobId;
    accountId: AccountId;
    websiteId: WebsiteId;
    idempotencyKey: string;
    dependency?: Dependency;
    maxAttempts?: number;
  }) {
    this.id = init.id;
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

export class PostJob {
  id: JobId;
  submission: Submission;
  attemptOf?: JobId; // links a retry job to its origin
  resumeMode: ResumeMode;
  status: NodeStatus;
  priority: number;
  scheduledFor?: number; // epoch ms
  createdAt: number;
  completedAt?: number;
  tasks: WebsiteTask[];

  constructor(init: {
    id: JobId;
    submission: Submission;
    resumeMode?: ResumeMode;
    priority?: number;
    scheduledFor?: number;
    attemptOf?: JobId;
  }) {
    this.id = init.id;
    this.submission = init.submission;
    this.resumeMode = init.resumeMode ?? ResumeMode.NEW;
    this.priority = init.priority ?? 0;
    this.scheduledFor = init.scheduledFor;
    this.attemptOf = init.attemptOf;
    this.status = NodeStatus.QUEUED;
    this.createdAt = Date.now();
    this.tasks = [];
  }
}

// ---------------------------------------------------------------------------
// Tree helpers / derived state
// ---------------------------------------------------------------------------

export function allUnits(task: WebsiteTask): Unit[] {
  return task.units;
}

/** A task is "done-done" when every unit is terminal-done. */
export function isTaskComplete(task: WebsiteTask): boolean {
  if (task.units.length === 0) return TERMINAL_DONE.has(task.status);
  return task.units.every((u) => TERMINAL_DONE.has(u.status));
}

export function computeJobStatus(job: PostJob): NodeStatus {
  const statuses = job.tasks.map((t) => t.status);
  if (statuses.length === 0) return NodeStatus.SUCCEEDED;
  if (statuses.some((s) => s === NodeStatus.RUNNING)) return NodeStatus.RUNNING;
  if (statuses.some((s) => s === NodeStatus.WAITING)) return NodeStatus.WAITING;
  if (
    statuses.some(
      (s) => s === NodeStatus.QUEUED || s === NodeStatus.READY,
    )
  )
    return NodeStatus.RUNNING;
  // all terminal
  if (statuses.some((s) => s === NodeStatus.FAILED)) return NodeStatus.FAILED;
  if (statuses.every((s) => s === NodeStatus.CANCELLED))
    return NodeStatus.CANCELLED;
  return NodeStatus.SUCCEEDED;
}

// ---------------------------------------------------------------------------
// Dependency evaluation
// ---------------------------------------------------------------------------

/** The task IDs referenced by a dependency (empty if none). */
export function depTaskIds(task: WebsiteTask): TaskId[] {
  return task.dependency?.tasks ?? [];
}

export type DependencyState = 'none' | 'satisfied' | 'pending' | 'blocked';

/**
 * Evaluate a task's dependency gate against the current tree.
 *  - 'none'      : no dependency declared.
 *  - 'satisfied' : the gate is met; the task may run.
 *  - 'pending'   : not yet met, but still reachable (some deps not terminal).
 *  - 'blocked'   : can never be met (too many deps failed/skipped) -> skip it.
 *
 * SKIPPED upstream tasks count as "done" for 'all' (they produced no URL but
 * are not a failure), but do NOT count as a success for 'any'/'count'.
 */
export function evaluateDependency(
  job: PostJob,
  task: WebsiteTask,
): DependencyState {
  const dep = task.dependency;
  if (!dep || dep.tasks.length === 0) return 'none';

  const deps = dep.tasks
    .map((id) => job.tasks.find((t) => t.id === id))
    .filter((t): t is WebsiteTask => !!t);
  if (deps.length === 0) return 'none';

  const succeeded = deps.filter((t) => t.status === NodeStatus.SUCCEEDED).length;
  const skipped = deps.filter((t) => t.status === NodeStatus.SKIPPED).length;
  const terminal = deps.filter((t) => TERMINAL_ALL.has(t.status)).length;
  const total = deps.length;

  if (dep.mode === 'all') {
    // every dep must be terminal-done (SUCCEEDED or SKIPPED)
    if (succeeded + skipped === total) return 'satisfied';
    // blocked if any dep is terminal but NOT done (FAILED/CANCELLED)
    const terminalNotDone = terminal - succeeded - skipped;
    if (terminalNotDone > 0) return 'blocked';
    return 'pending';
  }

  const need = dep.mode === 'count' ? dep.n : 1; // 'any' === count 1
  if (succeeded >= need) return 'satisfied';
  // enough deps could still succeed?
  const stillPossible = total - (terminal - succeeded); // succeeded + not-yet-terminal
  if (stillPossible < need) return 'blocked';
  return 'pending';
}

