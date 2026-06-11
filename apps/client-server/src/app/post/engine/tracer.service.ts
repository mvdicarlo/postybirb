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
import { appendFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { WSGateway } from '../../web-socket/web-socket-gateway';
import { RelayJob, RelayTask, RelayUnit, computeJobStatus } from './model';

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

@Injectable()
export class RelayTracer {
  private readonly dir = join(PostyBirbDirectories.LOGS_DIRECTORY, 'post-traces');

  private readonly entries: TraceEntry[] = [];

  /** Cap the in-memory buffer so a long-running process can't leak. The full
   * record always lives on disk (per-job NDJSON); this buffer only backs the
   * recent-history/ledger projection. */
  private readonly maxEntries = 5000;

  private dirReady = false;

  constructor(@Optional() private readonly webSocket?: WSGateway) {}

  /** Emit one structured trace line (also buffered in-memory for the ledger). */
  emit(entry: Omit<TraceEntry, 'ts'>): void {
    const full: TraceEntry = { ts: new Date().toISOString(), ...entry };
    this.entries.push(full);
    if (this.entries.length > this.maxEntries) {
      this.entries.splice(0, this.entries.length - this.maxEntries);
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
    return jobId
      ? this.entries.filter((e) => e.jobId === jobId)
      : this.entries.slice();
  }

  /** Filtered projection for the post-history view. */
  getLedger(jobId: string): TraceEntry[] {
    return this.getEntries(jobId).filter((e) => LEDGER_EVENTS.has(e.event));
  }
}

// ---------------------------------------------------------------------------
// Projection (tree -> JobTreeNode)
// ---------------------------------------------------------------------------

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
  const done = task.units.filter(
    (u) => u.status === NodeStatus.SUCCEEDED || u.status === NodeStatus.SKIPPED,
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
  const done = job.tasks.filter(
    (t) => t.status === NodeStatus.SUCCEEDED || t.status === NodeStatus.SKIPPED,
  ).length;
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
