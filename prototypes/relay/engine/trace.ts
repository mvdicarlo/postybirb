/**
 * Relay posting framework — unified trace + UI projection.
 *
 * One append-only NDJSON stream per job. Every stage transition, HTTP attempt,
 * resize, rate-limit wait, retry and outcome is one JSON line, correlated by
 * jobId / taskId / unitId / stage.
 *
 *  - traces/<jobId>.ndjson  ← deep debug firehose (shareable single file)
 *  - onDelta(node)          ← compact UI deltas (same shape the UI renders)
 *  - projectJob(job)        ← full snapshot for reload / late-join
 *
 * The DB "event ledger" of the old design becomes a filtered projection of
 * this trace (only UI-relevant event kinds), so there is no second source of
 * truth.
 */

import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import {
    computeJobStatus,
    NodeStatus,
    PostJob,
    Unit,
    UnitKind,
    WebsiteTask,
} from './model.ts';

export type TraceLevel = 'debug' | 'info' | 'warn' | 'error';

export type TraceEntry = {
  ts: string;
  level: TraceLevel;
  jobId: string;
  taskId?: string;
  unitId?: string;
  account?: string;
  website?: string;
  stage?: string;
  event: string;
  data?: Record<string, unknown>;
};

// ---------------------------------------------------------------------------
// UI projection shape — exactly what the UI renders
// ---------------------------------------------------------------------------

export type JobTreeNode = {
  id: string;
  kind: 'job' | 'task' | 'unit';
  label: string;
  status: NodeStatus;
  progress?: { done: number; total: number };
  waitingUntil?: string;
  sourceUrl?: string;
  error?: { kind: string; stage: string; message: string };
  children?: JobTreeNode[];
};

export type DeltaListener = (node: JobTreeNode) => void;

export class Tracer {
  private readonly dir: string;
  private readonly entries: TraceEntry[] = [];
  private readonly listeners: DeltaListener[] = [];
  private readonly writeToDisk: boolean;

  constructor(opts?: { dir?: string; writeToDisk?: boolean }) {
    this.dir = opts?.dir ?? join(process.cwd(), 'prototypes', 'relay', 'traces');
    this.writeToDisk = opts?.writeToDisk ?? true;
    if (this.writeToDisk) {
      mkdirSync(this.dir, { recursive: true });
    }
  }

  onDelta(listener: DeltaListener): void {
    this.listeners.push(listener);
  }

  /** Emit one structured trace line. */
  emit(entry: Omit<TraceEntry, 'ts'>): void {
    const full: TraceEntry = { ts: new Date().toISOString(), ...entry };
    this.entries.push(full);
    if (this.writeToDisk) {
      appendFileSync(
        join(this.dir, `${full.jobId}.ndjson`),
        `${JSON.stringify(full)}\n`,
      );
    }
  }

  /** Push a UI delta for a single task subtree. */
  pushTaskDelta(job: PostJob, task: WebsiteTask): void {
    const node = projectTask(task, job);
    for (const l of this.listeners) l(node);
  }

  pushJobDelta(job: PostJob): void {
    const node = projectJob(job);
    for (const l of this.listeners) l(node);
  }

  /** All trace lines for a job (for the offline replay/debug harness). */
  getEntries(jobId?: string): TraceEntry[] {
    return jobId
      ? this.entries.filter((e) => e.jobId === jobId)
      : this.entries.slice();
  }
}

// ---------------------------------------------------------------------------
// Projection functions (tree -> UI nodes)
// ---------------------------------------------------------------------------

function projectUnit(unit: Unit): JobTreeNode {
  return {
    id: unit.id,
    kind: 'unit',
    label:
      unit.kind === UnitKind.BATCH
        ? `batch #${unit.ordinal + 1} (${unit.fileIds.length} file${
            unit.fileIds.length === 1 ? '' : 's'
          })`
        : 'message',
    status: unit.status,
    sourceUrl: unit.sourceUrl,
    error: unit.error
      ? { kind: unit.error.kind, stage: unit.error.stage, message: unit.error.message }
      : undefined,
  };
}

export function projectTask(task: WebsiteTask, job: PostJob): JobTreeNode {
  const total = task.units.length;
  const done = task.units.filter(
    (u) =>
      u.status === NodeStatus.SUCCEEDED || u.status === NodeStatus.SKIPPED,
  ).length;
  return {
    id: task.id,
    kind: 'task',
    label: `${task.websiteId}:${task.accountId}`,
    status: task.status,
    progress: total > 0 ? { done, total } : undefined,
    waitingUntil: task.waitingUntil
      ? new Date(task.waitingUntil).toISOString()
      : undefined,
    sourceUrl: task.sourceUrl,
    error: task.error
      ? { kind: task.error.kind, stage: task.error.stage, message: task.error.message }
      : undefined,
    children: task.units.map(projectUnit),
  };
}

export function projectJob(job: PostJob): JobTreeNode {
  const total = job.tasks.length;
  const done = job.tasks.filter(
    (t) =>
      t.status === NodeStatus.SUCCEEDED || t.status === NodeStatus.SKIPPED,
  ).length;
  return {
    id: job.id,
    kind: 'job',
    label: `${job.submission.type}: ${job.submission.title}`,
    status: computeJobStatus(job),
    progress: { done, total },
    children: job.tasks.map((t) => projectTask(t, job)),
  };
}

/**
 * The filtered DB-ledger projection: only the event kinds the history view
 * cares about. Same ids as the trace so they cross-reference.
 */
const LEDGER_EVENTS: ReadonlySet<string> = new Set([
  'task.started',
  'task.succeeded',
  'task.failed',
  'unit.posted',
  'unit.failed',
  'file.resized',
]);

export function projectLedger(tracer: Tracer, jobId: string): TraceEntry[] {
  return tracer.getEntries(jobId).filter((e) => LEDGER_EVENTS.has(e.event));
}
