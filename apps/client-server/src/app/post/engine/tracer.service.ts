/**
 * Relay engine — unified trace + UI projection.
 *
 * One append-only NDJSON stream per job under the logs directory. Every stage
 * transition, resize, rate-limit wait, retry and outcome is one JSON line,
 * correlated by jobId / taskId / unitId / stage. The same transitions are
 * projected to a compact {@link JobTreeNode} and pushed over WebSocket
 * (POST_STATE_DELTA) for the UI, and can be filtered into a DB ledger.
 */

import { Injectable, Optional } from '@nestjs/common';
import { PostyBirbDirectories } from '@postybirb/fs';
import { POST_STATE_DELTA } from '@postybirb/socket-events';
import { JobTreeNode, NodeStatus, UnitKind } from '@postybirb/types';
import {
    appendFile,
    mkdir,
    readFile,
    readdir,
    stat,
    unlink,
} from 'node:fs/promises';
import { join } from 'node:path';
import { WSGateway } from '../../web-socket/web-socket-gateway';
import { RelayJob, RelayTask, RelayUnit, computeJobStatus, isDone } from './model';

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

const LEDGER_EVENTS: ReadonlySet<string> = new Set([
  'task.started',
  'task.succeeded',
  'task.failed',
  'unit.posted',
  'unit.failed',
  'file.resized',
]);

/**
 * Common trace fields that identify a task within its job. Centralizes the
 * jobId/taskId/account/website quartet that every task-scoped trace line and
 * UI delta carries, so call sites stay terse and consistent.
 */
export function taskTraceFields(
  job: RelayJob,
  task: RelayTask,
): { jobId: string; taskId: string; account: string; website: string } {
  return {
    jobId: job.id,
    taskId: task.id,
    account: task.accountId,
    website: task.websiteId,
  };
}

/** Count the child nodes that are "done" (succeeded or skipped). */
function countDone(nodes: ReadonlyArray<{ status: NodeStatus }>): number {
  return nodes.filter((n) => isDone(n)).length;
}

@Injectable()
export class RelayTracer {
  private readonly dir = join(PostyBirbDirectories.LOGS_DIRECTORY, 'post-traces');

  /**
   * Per-job in-memory ring buffers. Keyed by jobId and bounded two ways so a
   * long-running process can't leak: each job keeps at most
   * {@link maxEntriesPerJob} recent entries, and at most {@link maxJobs} jobs
   * are retained (oldest-touched evicted first). A single busy job can no
   * longer evict another job's entries (which previously truncated its ledger
   * / history). The full record always lives on disk (per-job NDJSON).
   */
  private readonly buffers = new Map<string, TraceEntry[]>();

  private readonly maxEntriesPerJob = 2000;

  private readonly maxJobs = 200;

  private dirReady = false;

  constructor(@Optional() private readonly webSocket?: WSGateway) {}

  /** Emit one structured trace line (also buffered in-memory for the ledger). */
  emit(entry: Omit<TraceEntry, 'ts'>): void {
    const full: TraceEntry = { ts: new Date().toISOString(), ...entry };

    // Touch-order the job key (delete+set) so active jobs survive eviction.
    let buf = this.buffers.get(full.jobId);
    if (buf) {
      this.buffers.delete(full.jobId);
    } else {
      buf = [];
    }
    this.buffers.set(full.jobId, buf);

    buf.push(full);
    if (buf.length > this.maxEntriesPerJob) {
      buf.splice(0, buf.length - this.maxEntriesPerJob);
    }

    while (this.buffers.size > this.maxJobs) {
      const oldest = this.buffers.keys().next().value;
      if (oldest === undefined) break;
      this.buffers.delete(oldest);
    }

    this.writeLine(full).catch(() => {
      /* best-effort: tracing must never break posting */
    });
  }

  private async writeLine(full: TraceEntry): Promise<void> {
    if (process.env.NODE_ENV === 'test') return; // keep specs off-disk
    try {
      if (!this.dirReady) {
        await mkdir(this.dir, { recursive: true });
        this.dirReady = true;
      }
      await appendFile(
        join(this.dir, `${full.jobId}.ndjson`),
        `${JSON.stringify(full)}\n`,
      );
    } catch {
      // Tracing must never break posting; swallow disk errors.
    }
  }

  /** Push a UI delta for a single task subtree. */
  pushTaskDelta(job: RelayJob, task: RelayTask): void {
    this.webSocket?.emit({ event: POST_STATE_DELTA, data: projectTask(task) });
  }

  /** Push a UI delta for the whole job. */
  pushJobDelta(job: RelayJob): void {
    this.webSocket?.emit({ event: POST_STATE_DELTA, data: projectJob(job) });
  }

  getEntries(jobId?: string): TraceEntry[] {
    if (jobId) return (this.buffers.get(jobId) ?? []).slice();
    const all: TraceEntry[] = [];
    for (const buf of this.buffers.values()) all.push(...buf);
    return all;
  }

  /** Filtered projection for the post-history view. */
  getLedger(jobId: string): TraceEntry[] {
    return this.getEntries(jobId).filter((e) => LEDGER_EVENTS.has(e.event));
  }

  /** Absolute path to the NDJSON file for a job (may not yet exist). */
  getLogPath(jobId: string): string {
    return join(this.dir, `${jobId}.ndjson`);
  }

  /**
   * Read the persisted NDJSON for a job from disk. Returns the raw NDJSON
   * text (one JSON entry per line). Returns empty string if the file does
   * not exist or cannot be read — tracing must never break the caller.
   */
  async readDiskLog(jobId: string): Promise<string> {
    try {
      return await readFile(this.getLogPath(jobId), 'utf-8');
    } catch {
      return '';
    }
  }

  /**
   * Prune persisted NDJSON trace files to bound disk usage. Files are removed
   * when older than {@link maxAgeMs}; if more than {@link maxFiles} remain, the
   * oldest are removed until the cap is met. Best-effort: never throws.
   * Returns the number of files deleted.
   */
  async pruneOldLogs(
    maxAgeMs = 30 * 24 * 60 * 60 * 1000, // 30 days
    maxFiles = 1000,
  ): Promise<number> {
    try {
      const names = (await readdir(this.dir)).filter((n) =>
        n.endsWith('.ndjson'),
      );
      const now = Date.now();
      const stats = await Promise.all(
        names.map(async (name) => {
          const path = join(this.dir, name);
          try {
            const s = await stat(path);
            return { path, mtime: s.mtimeMs };
          } catch {
            return undefined;
          }
        }),
      );
      const files = stats.filter(
        (f): f is { path: string; mtime: number } => f !== undefined,
      );

      const expired = files.filter((f) => now - f.mtime > maxAgeMs);
      const survivors = files.filter((f) => now - f.mtime <= maxAgeMs);

      const toDelete = [...expired];
      if (survivors.length > maxFiles) {
        survivors.sort((a, b) => a.mtime - b.mtime); // oldest first
        toDelete.push(...survivors.slice(0, survivors.length - maxFiles));
      }

      const results = await Promise.all(
        toDelete.map((f) => unlink(f.path).then(() => true, () => false)),
      );
      return results.filter(Boolean).length;
    } catch {
      // Directory may not exist yet, or be unreadable; nothing to prune.
      return 0;
    }
  }
}

function projectUnit(unit: RelayUnit): JobTreeNode {
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
      ? {
          kind: unit.error.kind,
          stage: unit.error.stage,
          message: unit.error.message,
        }
      : undefined,
  };
}

export function projectTask(task: RelayTask): JobTreeNode {
  const total = task.units.length;
  const done = countDone(task.units);
  return {
    id: task.id,
    kind: 'task',
    accountId: task.accountId,
    label: `${task.websiteId}:${task.accountId}`,
    status: task.status,
    progress: total > 0 ? { done, total } : undefined,
    waitingUntil: task.waitingUntil
      ? new Date(task.waitingUntil).toISOString()
      : undefined,
    sourceUrl: task.sourceUrl,
    error: task.error
      ? {
          kind: task.error.kind,
          stage: task.error.stage,
          message: task.error.message,
        }
      : undefined,
    children: task.units.map(projectUnit),
  };
}

export function projectJob(job: RelayJob): JobTreeNode {
  const total = job.tasks.length;
  const done = countDone(job.tasks);
  return {
    id: job.id,
    kind: 'job',
    submissionId: job.submissionId,
    label: `${job.submissionId}`,
    status: computeJobStatus(job),
    progress: { done, total },
    children: job.tasks.map(projectTask),
  };
}
