/**
 * Relay posting framework — scheduler + job runner.
 *
 * Owns everything the old PostQueueService + per-type PostManager singletons
 * did, but with true concurrency and a persisted-friendly model:
 *
 *   - queue of jobs, ordered by priority then enqueue time
 *   - one-shot + recurring scheduling (scheduledFor) with a catch-up sweep
 *   - configurable job/task concurrency (no global "one post at a time" lock)
 *   - dependency gating (all/any/count modes; a task is READY only when its
 *     source-URL dependency is satisfied)
 *   - WAITING handling for rate limits (re-runs the pass; completed units skip)
 *   - typed-error retry policy with backoff
 *   - crash recovery: re-run any non-done node on resume
 *
 * Time is injectable (`now`) and waits go through `wait()` so tests can run
 * deterministically; the demo uses real timers.
 */

import {
    classify,
    decideRetry,
    ErrorKind,
    StageError,
    toTaskError,
} from './errors.ts';
import {
    computeJobStatus,
    evaluateDependency,
    NodeStatus,
    PostJob,
    ResumeMode,
    type Submission,
    TERMINAL_ALL,
    WebsiteTask
} from './model.ts';
import { type PipelineDeps, planJob, resetForResume, runTaskPass } from './pipeline.ts';
import { Tracer } from './trace.ts';

export type SchedulerOptions = {
  maxConcurrentJobs: number;
  maxConcurrentTasks: number;
  /** real wait by default; override for deterministic tests */
  wait?: (ms: number) => Promise<void>;
};

const realWait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export class Scheduler {
  private readonly deps: PipelineDeps;
  private readonly opts: SchedulerOptions;
  private readonly wait: (ms: number) => Promise<void>;
  private readonly jobs = new Map<string, PostJob>();
  private readonly controllers = new Map<string, AbortController>();
  private seq = 0;

  constructor(deps: PipelineDeps, opts?: Partial<SchedulerOptions>) {
    this.deps = deps;
    this.opts = {
      maxConcurrentJobs: opts?.maxConcurrentJobs ?? 2,
      maxConcurrentTasks: opts?.maxConcurrentTasks ?? 4,
      wait: opts?.wait,
    };
    this.wait = this.opts.wait ?? realWait;
  }

  get tracer(): Tracer {
    return this.deps.tracer;
  }

  /** Enqueue a fresh job for a submission. */
  enqueue(
    submission: Submission,
    opts?: { priority?: number; scheduledFor?: number; resumeMode?: ResumeMode },
  ): PostJob {
    const job = new PostJob({
      id: `j_${++this.seq}_${submission.id}`,
      submission,
      priority: opts?.priority ?? 0,
      scheduledFor: opts?.scheduledFor,
      resumeMode: opts?.resumeMode ?? ResumeMode.NEW,
    });
    planJob(job, this.deps.registry);
    this.jobs.set(job.id, job);
    this.deps.tracer.emit({
      jobId: job.id,
      level: 'info',
      event: 'job.enqueued',
      data: {
        submission: submission.title,
        type: submission.type,
        tasks: job.tasks.map((t) => ({ id: t.id, units: t.units.length, status: t.status })),
      },
    });
    return job;
  }

  /** Re-enqueue an existing job to resume it (e.g. after a crash or failure). */
  resume(jobId: string, mode: ResumeMode): PostJob {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`unknown job ${jobId}`);
    job.resumeMode = mode;
    resetForResume(job, mode);
    job.completedAt = undefined;
    job.status = NodeStatus.QUEUED;
    this.deps.tracer.emit({
      jobId,
      level: 'info',
      event: 'job.resume',
      data: { mode },
    });
    return job;
  }

  cancel(jobId: string): void {
    this.controllers.get(jobId)?.abort();
  }

  getJob(jobId: string): PostJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Run all due jobs to completion (or terminal failure). Respects job
   * concurrency. Returns when the queue is drained.
   */
  async runToIdle(now = Date.now()): Promise<void> {
    for (;;) {
      const due = [...this.jobs.values()]
        .filter(
          (j) =>
            !TERMINAL_ALL.has(j.status) &&
            (j.scheduledFor === undefined || j.scheduledFor <= now),
        )
        .sort((a, b) => b.priority - a.priority || a.createdAt - b.createdAt);

      if (due.length === 0) return;

      const batch = due.slice(0, this.opts.maxConcurrentJobs);
      await Promise.all(batch.map((job) => this.runJob(job)));
      now = Date.now();
    }
  }

  // -------------------------------------------------------------------------
  // Job execution
  // -------------------------------------------------------------------------

  private async runJob(job: PostJob): Promise<void> {
    job.status = NodeStatus.RUNNING;
    const controller = new AbortController();
    this.controllers.set(job.id, controller);

    // Drive tasks until all are terminal, honoring dependency gating and task
    // concurrency. WAITING tasks are retried after their wait elapses.
    for (;;) {
      if (controller.signal.aborted) break;

      const pending = job.tasks.filter((t) => !TERMINAL_ALL.has(t.status));
      if (pending.length === 0) break;

      // Which tasks can run now? READY = deps satisfied & not waiting.
      const runnable = pending.filter((t) => this.isRunnable(job, t, Date.now()));

      if (runnable.length === 0) {
        // Everything pending is blocked on a dependency or a rate-limit wait.
        const soonest = this.soonestWakeup(job);
        if (soonest === undefined) {
          // Deadlock guard: a dependency failed. Mark dependents skipped.
          this.skipBlockedDependents(job);
          continue;
        }
        const delay = Math.max(0, soonest - Date.now());
        await this.wait(delay);
        continue;
      }

      const slice = runnable.slice(0, this.opts.maxConcurrentTasks);
      await Promise.all(slice.map((t) => this.runTaskWithRetries(job, t, controller.signal)));
    }

    job.status = computeJobStatus(job);
    job.completedAt = Date.now();
    this.handleTerminal(job);
    this.controllers.delete(job.id);
    this.deps.tracer.pushJobDelta(job);
  }

  private isRunnable(job: PostJob, task: WebsiteTask, now: number): boolean {
    if (TERMINAL_ALL.has(task.status)) return false;
    if (task.waitingUntil !== undefined && task.waitingUntil > now) return false;
    const dep = evaluateDependency(job, task);
    return dep === 'satisfied' || dep === 'none';
  }

  private soonestWakeup(job: PostJob): number | undefined {
    let soonest: number | undefined;
    let anyDepPending = false;
    for (const t of job.tasks) {
      if (TERMINAL_ALL.has(t.status)) continue;
      if (t.waitingUntil !== undefined) {
        soonest = soonest === undefined ? t.waitingUntil : Math.min(soonest, t.waitingUntil);
      } else if (evaluateDependency(job, t) === 'pending') {
        anyDepPending = true;
      }
    }
    if (soonest !== undefined) return soonest;
    // Dependency-pending tasks are waiting on deps that are still running in
    // this same loop; a tiny delay lets the loop re-check once they settle.
    return anyDepPending ? Date.now() + 5 : undefined;
  }

  private skipBlockedDependents(job: PostJob): void {
    for (const t of job.tasks) {
      if (TERMINAL_ALL.has(t.status)) continue;
      if (evaluateDependency(job, t) === 'blocked') {
        t.status = NodeStatus.SKIPPED;
        this.deps.tracer.emit({
          jobId: job.id,
          taskId: t.id,
          level: 'warn',
          event: 'task.skipped',
          data: { reason: 'dependency failed' },
        });
      }
    }
  }

  /**
   * Run one task, applying the retry/backoff policy. RATE_LIMITED puts the
   * task into WAITING (handled by the outer loop) rather than blocking a slot.
   */
  private async runTaskWithRetries(
    job: PostJob,
    task: WebsiteTask,
    signal: AbortSignal,
  ): Promise<void> {
    task.status = NodeStatus.RUNNING;
    task.waitingUntil = undefined;
    this.deps.tracer.emit({
      jobId: job.id,
      taskId: task.id,
      account: task.accountId,
      website: task.websiteId,
      level: 'info',
      event: 'task.started',
      data: { attempt: task.attempts + 1 },
    });

    try {
      await runTaskPass(this.deps, job, task, signal);
    } catch (err) {
      const se: StageError = err instanceof StageError ? err : classify('unknown', err);

      if (se.kind === ErrorKind.RATE_LIMITED) {
        // Park the task; outer loop will re-run the pass when the wait elapses.
        task.status = NodeStatus.WAITING;
        // waitingUntil already set inside the gate stage
        this.deps.tracer.pushTaskDelta(job, task);
        return;
      }

      const decision = decideRetry(se, task.attempts, task.maxAttempts);
      if (decision.action === 'retry') {
        if (decision.consumesAttempt) task.attempts++;
        this.deps.tracer.emit({
          jobId: job.id,
          taskId: task.id,
          level: 'warn',
          event: 'task.retry',
          data: { kind: se.kind, delayMs: decision.delayMs, attempt: task.attempts },
        });
        await this.wait(decision.delayMs);
        // Re-run immediately (recursion bounded by maxAttempts).
        await this.runTaskWithRetries(job, task, signal);
        return;
      }

      // Terminal failure.
      task.status = signal.aborted ? NodeStatus.CANCELLED : NodeStatus.FAILED;
      task.error = toTaskError(se);
      this.deps.tracer.emit({
        jobId: job.id,
        taskId: task.id,
        account: task.accountId,
        website: task.websiteId,
        level: 'error',
        event: 'task.failed',
        data: { kind: se.kind, stage: se.stage, message: se.message },
      });
      this.deps.tracer.pushTaskDelta(job, task);
    }
  }

  private handleTerminal(job: PostJob): void {
    const status = job.status;
    const name = job.submission.title;
    if (status === NodeStatus.SUCCEEDED) {
      this.deps.tracer.emit({
        jobId: job.id,
        level: 'info',
        event: 'job.completed',
        data: { result: 'success', submission: name },
      });
    } else {
      const failed = job.tasks.filter((t) => t.status === NodeStatus.FAILED);
      this.deps.tracer.emit({
        jobId: job.id,
        level: status === NodeStatus.FAILED ? 'error' : 'warn',
        event: 'job.completed',
        data: {
          result: status,
          submission: name,
          failedTasks: failed.map((t) => ({ id: t.id, error: t.error?.message })),
        },
      });
    }
  }
}
