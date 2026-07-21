/**
 * Relay engine — job-tree persistence.
 *
 * Maps the in-memory {@link RelayJob} tree to the post-job / post-task /
 * post-unit tables and back. Used by the scheduler/manager to persist every
 * transition (so a crash leaves a consistent, resumable tree) and to recover
 * active jobs on boot.
 *
 * Save is an idempotent upsert keyed by the engine's stable, job-scoped ids
 * (`<jobId>:t:<website>:<account>` / `<taskId>:b<n>`), so repeated saves during
 * a run simply update existing rows.
 */

import { Injectable } from '@nestjs/common';
import {
  PostJob,
  PostJobRepository,
  PostTaskRepository,
  PostUnitRepository,
} from '@postybirb/database';
import { ITaskError, NodeStatus, PostErrorKind } from '@postybirb/types';
import { PIPELINE_STAGES } from './constants';
import { RelayJob, RelayTask, RelayUnit, isTerminal } from './model';

@Injectable()
export class RelayPersistence {
  private readonly jobs = new PostJobRepository();

  private readonly tasks = new PostTaskRepository();

  private readonly units = new PostUnitRepository();

  /** Insert the initial tree for a freshly-planned job. */
  async create(job: RelayJob, version?: string): Promise<void> {
    await this.jobs.insert({
      id: job.id,
      version,
      submissionId: job.submissionId,
      attemptOf: job.attemptOf,
      status: job.status,
      resumeMode: job.resumeMode,
    });

    for (const task of job.tasks) {
      
      await this.tasks.insert(this.taskValues(task));
      for (const unit of task.units) {
        
        await this.units.insert(this.unitValues(unit));
      }
    }
  }

  /** Persist the current state of the whole tree (upsert). */
  async save(job: RelayJob): Promise<void> {
    await this.jobs.update(job.id, {
      status: job.status,
      resumeMode: job.resumeMode,
      completedAt:
        job.completedAt !== undefined
          ? new Date(job.completedAt).toISOString()
          : undefined,
    });
    for (const task of job.tasks) {
      
      await this.saveTask(task);
    }
  }

  /** Persist a single task subtree (used after each task transition). */
  async saveTask(task: RelayTask): Promise<void> {
    await this.tasks.update(task.id, {
      status: task.status,
      dependency: task.dependency,
      attempts: task.attempts,
      sourceUrl: task.sourceUrl,
      message: task.message,
      error: task.error,
      waitingUntil: task.waitingUntil,
    });
    for (const unit of task.units) {
      
      await this.units.update(unit.id, {
        status: unit.status,
        sourceUrl: unit.sourceUrl,
        error: unit.error,
      });
    }
  }

  /** Load all active (non-terminal) jobs as RelayJob trees for recovery. */
  async loadActive(): Promise<RelayJob[]> {
    const rows = await this.jobs.findActive();
    return rows.map((row) => this.toRelayJob(row));
  }

  /** Load all jobs for a submission (newest first) as RelayJob trees. */
  async loadBySubmission(submissionId: string): Promise<RelayJob[]> {
    const rows = await this.jobs.findBySubmission(submissionId);
    return rows.map((row) => this.toRelayJob(row));
  }

  /**
   * The terminal status of the submission's most recent post job, but only if
   * that job was created at/after `since`. Returns undefined when the newest
   * job is still running, predates `since` (it belongs to an earlier post), or
   * none exists.
   *
   * NOTE: do not use the
   * {@link RelayJob} trees from {@link loadBySubmission} here — their createdAt
   * is re-stamped to load time by {@link toRelayJob}.
   */
  async outcomeSince(
    submissionId: string,
    since: string,
  ): Promise<NodeStatus | undefined> {
    const rows = await this.jobs.findBySubmission(submissionId); // newest first
    const newest = rows[0];
    if (!newest) return undefined;
    const { status } = newest;
    if (!isTerminal(status)) return undefined;
    if (newest.createdAt < since) return undefined;
    return status;
  }

  /**
   * Force-mark every non-terminal job/task/unit for a submission as CANCELLED.
   * Used as a fallback when a user cancels a submission whose job is not live
   * in the scheduler (e.g. recovery silently dropped it after a crash). Returns
   * the number of jobs that were transitioned so the caller can tell whether
   * anything actually needed clearing.
   */
  async cancelNonTerminalForSubmission(submissionId: string): Promise<number> {
    const rows = await this.jobs.findBySubmission(submissionId);
    const nowIso = new Date().toISOString();
    let cleared = 0;
    for (const row of rows) {
      const { status } = row;
      if (isTerminal(status)) continue;
      cleared += 1;
      
      await this.jobs.update(row.id, {
        status: NodeStatus.CANCELLED,
        completedAt: nowIso,
      });
      
      await this.terminateRowSubtree(row, NodeStatus.CANCELLED);
    }
    return cleared;
  }

  /** Force-mark a single job (and its tasks/units) terminal-FAILED. */
  async failJob(jobId: string, message: string): Promise<void> {
    const row = await this.jobs.findById(jobId);
    if (!row) return;
    const nowIso = new Date().toISOString();
    await this.jobs.update(row.id, {
      status: NodeStatus.FAILED,
      completedAt: nowIso,
    });
    await this.terminateRowSubtree(row, NodeStatus.FAILED, {
      kind: PostErrorKind.FATAL,
      stage: PIPELINE_STAGES.RECOVER,
      message,
      retryable: false,
    });
  }

  /**
   * Transition every still-running task (and its still-running units) of a
   * persisted job row to a terminal `status`, optionally stamping a task error.
   * Already-terminal nodes are left untouched. Shared by the cancel- and fail-
   * sweep paths so the "walk the subtree and close out open work" logic lives
   * in one place.
   */
  private async terminateRowSubtree(
    row: PostJob,
    status: NodeStatus,
    error?: ITaskError,
  ): Promise<void> {
    for (const task of row.tasks ?? []) {
      if (isTerminal(task.status as NodeStatus)) continue;
      
      await this.tasks.update(task.id, {
        status,
        waitingUntil: null,
        ...(error ? { error } : {}),
      });
      for (const unit of task.units ?? []) {
        if (isTerminal(unit.status as NodeStatus)) continue;
        
        await this.units.update(unit.id, { status });
      }
    }
  }

  private taskValues(task: RelayTask) {
    return {
      id: task.id,
      jobId: task.jobId,
      accountId: task.accountId || undefined,
      websiteId: task.websiteId,
      status: task.status,
      dependency: task.dependency,
      attempts: task.attempts,
      maxAttempts: task.maxAttempts,
      sourceUrl: task.sourceUrl,
      message: task.message,
      error: task.error,
      waitingUntil: task.waitingUntil,
    };
  }

  private unitValues(unit: RelayUnit) {
    return {
      id: unit.id,
      taskId: unit.taskId,
      kind: unit.kind,
      ordinal: unit.ordinal,
      status: unit.status,
      fileIds: unit.fileIds,
      sourceUrl: unit.sourceUrl,
      error: unit.error,
    };
  }

  /** Project a recovered DB row back into the in-memory job tree the
   *  scheduler/pipeline operate on. Inverse of {@link taskValues} +
   *  {@link unitValues}; the scheduler then calls {@link resetForResume} to
   *  re-open any non-done nodes before running them again. */
  private toRelayJob(row: PostJob): RelayJob {
    const job = new RelayJob({
      id: row.id,
      submissionId: row.submissionId,
      resumeMode: row.resumeMode,
      attemptOf: row.attemptOf,
    });
    job.status = row.status as NodeStatus;
    job.completedAt = row.completedAt
      ? new Date(row.completedAt).getTime()
      : undefined;

    job.tasks = (row.tasks ?? []).map((t) => {
      const task = new RelayTask({
        id: t.id,
        jobId: t.jobId,
        accountId: t.accountId ?? '',
        websiteId: t.websiteId,
        dependency: t.dependency,
        maxAttempts: t.maxAttempts,
      });
      task.status = t.status as NodeStatus;
      task.attempts = t.attempts;
      task.sourceUrl = t.sourceUrl;
      task.message = t.message;
      task.error = t.error;
      task.waitingUntil = t.waitingUntil ?? undefined;
      // Sort by ordinal so the in-memory tree preserves batch order regardless
      // of the DB relation load order (batches must post 0, 1, 2, …).
      task.units = (t.units ?? [])
        .slice()
        .sort((a, b) => a.ordinal - b.ordinal)
        .map((u) => {
          const unit = new RelayUnit({
            id: u.id,
            taskId: u.taskId,
            kind: u.kind,
            ordinal: u.ordinal,
            fileIds: u.fileIds,
          });
          unit.status = u.status as NodeStatus;
          unit.sourceUrl = u.sourceUrl;
          unit.error = u.error;
          return unit;
        });
      return task;
    });

    return job;
  }
}
