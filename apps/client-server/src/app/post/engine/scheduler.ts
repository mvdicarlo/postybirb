/**
 * Relay engine — scheduler (job registry + job-level concurrency).
 *
 * Owns the live job working set, the job lifecycle (create/plan/adopt/resume/
 * forget/cancel), job-level concurrency (runToIdle), and job-level persistence.
 * Per-job task execution — the event-driven reactor, the staged pass + retry
 * policy, and durable per-task persistence — lives in {@link JobReactor}.
 *
 * Time is injectable (`wait`) so tests run deterministically.
 */

/* eslint-disable no-param-reassign */ // the scheduler mutates the job tree in place

import { NodeStatus, PostRecordResumeMode } from '@postybirb/types';
import { CancellableToken } from '../models/cancellable-token';
import { TRACER_JOB_EVENTS } from './constants';
import { JobReactor } from './job-reactor';
import { RelayJob, RelayTask, isTerminal } from './model';
import { PipelineDeps, planJob, resetForResume } from './pipeline';

export interface SchedulerOptions {
  maxConcurrentJobs: number;
  maxConcurrentTasks: number;
  /** real wait by default; override for deterministic tests */
  wait?: (ms: number) => Promise<void>;
  /** invoked after a task transition so callers can persist the subtree */
  onTaskChanged?: (job: RelayJob, task: RelayTask) => void | Promise<void>;
  /** invoked after a job transition (enqueue/complete) */
  onJobChanged?: (job: RelayJob) => void | Promise<void>;
}

export class RelayScheduler {
  private readonly deps: PipelineDeps;

  private readonly opts: Required<
    Omit<SchedulerOptions, 'wait' | 'onTaskChanged' | 'onJobChanged'>
  >;

  private readonly onJobChanged?: (job: RelayJob) => void | Promise<void>;

  /** Runs each job's task tree to a terminal state (one reactor, reused per job). */
  private readonly reactor: JobReactor;

  /**
   * The live working set: only non-terminal (or just-completed-awaiting-forget)
   * job trees the scheduler is actively running. This is the single in-memory
   * index of "what is running".
   */
  private readonly jobs = new Map<string, RelayJob>();

  private readonly tokens = new Map<string, CancellableToken>();

  constructor(deps: PipelineDeps, opts?: Partial<SchedulerOptions>) {
    this.deps = deps;
    this.opts = {
      maxConcurrentJobs: opts?.maxConcurrentJobs ?? 2,
      maxConcurrentTasks: opts?.maxConcurrentTasks ?? 4,
    };
    this.onJobChanged = opts?.onJobChanged;
    this.reactor = new JobReactor(deps, {
      maxConcurrentTasks: this.opts.maxConcurrentTasks,
      wait: opts?.wait,
      onTaskChanged: opts?.onTaskChanged,
    });
  }

  /** Register an already-planned (or recovered) job without re-planning it. */
  adopt(job: RelayJob): void {
    this.jobs.set(job.id, job);
    // Adopted jobs come from the database without a token (they didn't go through
    // createJob). Create one now so cancel() works and runJob has a token to use.
    if (!this.tokens.has(job.id)) {
      this.tokens.set(job.id, new CancellableToken());
    }
  }

  /**
   * Drop a non-terminal or partially-initialized job from scheduler memory.
   * Used to roll back enqueue failures before a job has been durably created.
   */
  discard(jobId: string): void {
    this.jobs.delete(jobId);
    this.tokens.delete(jobId);
  }

  /**
   * Drop a terminal job from the live working set to bound memory. After this
   * the job (and all history) is served from the database — the DB is the
   * source of truth for completed jobs. No-op if the job is unknown or still
   * non-terminal.
   */
  forget(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (!job || !isTerminal(job)) return;
    this.jobs.delete(jobId);
    this.tokens.delete(jobId);
  }

  /** All tracked job trees (the live working set, including any just-completed
   *  jobs not yet forgotten). Used by the manager to reap terminal jobs. */
  getTrackedJobs(): RelayJob[] {
    return [...this.jobs.values()];
  }

  /** All currently-active (non-terminal) job trees in the live working set. */
  getActiveJobs(): RelayJob[] {
    return [...this.jobs.values()].filter((j) => !isTerminal(j));
  }

  /**
   * The newest currently-active (non-terminal) job for a submission, if one is
   * tracked.
   */
  getActiveJobForSubmission(submissionId: string): RelayJob | undefined {
    let found: RelayJob | undefined;
    for (const job of this.jobs.values()) {
      if (job.submissionId !== submissionId || isTerminal(job)) continue;
      if (!found || job.createdAt > found.createdAt) found = job;
    }
    return found;
  }

  private async persistJob(job: RelayJob): Promise<void> {
    if (this.onJobChanged) await this.onJobChanged(job);
  }

  /** Create and register a job WITHOUT planning it (caller must prepare deps). */
  createJob(
    submissionId: string,
    opts?: {
      resumeMode?: PostRecordResumeMode;
    },
  ): RelayJob {
    const job = new RelayJob({
      submissionId,
      resumeMode: opts?.resumeMode ?? PostRecordResumeMode.NEW,
    });
    this.jobs.set(job.id, job);
    // Create the cancellation token immediately so cancel() can interrupt the job
    // even before runJob is invoked.
    const token = new CancellableToken();
    this.tokens.set(job.id, token);
    return job;
  }

  /** Plan an already-created job (build its task/unit tree). */
  plan(job: RelayJob): void {
    planJob(job, this.deps);
    let submissionOptions:
      | Array<{ accountId: string; websiteId: string }>
      | undefined;
    try {
      submissionOptions = this.deps
        .getSubmission(job.id)
        .options.map((opt) => ({
          accountId: opt.accountId,
          websiteId: opt.websiteId,
        }));
    } catch {
      submissionOptions = undefined;
    }
    this.deps.tracer.emit({
      jobId: job.id,
      level: 'info',
      event: TRACER_JOB_EVENTS.ENQUEUED,
      data: {
        submissionId: job.submissionId,
        optionCount: submissionOptions?.length,
        options: submissionOptions,
        tasks: job.tasks.map((t) => ({
          id: t.id,
          units: t.units.length,
          status: t.status,
        })),
      },
    });
  }

  /** Convenience: create + plan in one step (used by tests). */
  enqueue(
    submissionId: string,
    opts?: {
      resumeMode?: PostRecordResumeMode;
    },
  ): RelayJob {
    const job = this.createJob(submissionId, opts);
    this.plan(job);
    return job;
  }

  resume(jobId: string, mode: PostRecordResumeMode): RelayJob {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`unknown job ${jobId}`);
    this.jobs.set(jobId, job);
    // The previous token was deleted when the job completed; create a fresh one
    // so the job can be cancelled again during this execution.
    this.tokens.set(jobId, new CancellableToken());
    job.resumeMode = mode;
    resetForResume(job, mode);
    job.completedAt = undefined;
    job.status = NodeStatus.QUEUED;
    this.deps.tracer.emit({
      jobId,
      level: 'info',
      event: TRACER_JOB_EVENTS.RESUME,
      data: { mode },
    });
    return job;
  }

  cancel(jobId: string): void {
    this.tokens.get(jobId)?.cancel();
  }

  getJob(jobId: string): RelayJob | undefined {
    return this.jobs.get(jobId);
  }

  /** Run all due jobs to completion (or terminal failure). */
  async runToIdle(): Promise<void> {
    for (;;) {
      const due = [...this.jobs.values()]
        .filter((j) => !isTerminal(j))
        .sort((a, b) => a.createdAt - b.createdAt);

      if (due.length === 0) return;
      const batch = due.slice(0, this.opts.maxConcurrentJobs);
      await Promise.all(batch.map((job) => this.runJob(job)));
    }
  }

  private async runJob(job: RelayJob): Promise<void> {
    job.status = NodeStatus.RUNNING;
    await this.persistJob(job);
    const token = this.tokens.get(job.id);
    if (!token) {
      throw new Error(
        `Job ${job.id} has no cancellation token; createJob was not called`,
      );
    }
    // Seed the UI posting-state store with the active job immediately. Without
    // this, early task/unit deltas can arrive before the client knows the job
    // root and get dropped.
    this.deps.tracer.pushJobDelta(job);

    try {
      // The reactor runs every task to a terminal state (force-settling the
      // remainder on cancel), so the job's rolled-up status is final here.
      await this.reactor.run(job, token);

      job.status = job.computeStatus();
      job.completedAt = Date.now();
      await this.persistJob(job);
      this.deps.tracer.pushJobDelta(job);
      this.deps.tracer.emit({
        jobId: job.id,
        level: job.status === NodeStatus.SUCCEEDED ? 'info' : 'warn',
        event: TRACER_JOB_EVENTS.COMPLETED,
        data: { result: job.status },
      });
    } finally {
      // Guarantee the token is cleaned up even if an error is thrown, so it
      // doesn't leak in memory and prevent a subsequent resume from working.
      this.tokens.delete(job.id);
    }
  }
}
