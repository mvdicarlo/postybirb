/**
 * Relay engine — scheduler + job runner.
 *
 * Owns the queue, concurrency, dependency gating, WAITING handling and the
 * typed-error retry policy. Operates over the in-memory job tree; PR #4 wires
 * persistence (load/save through the Post* repositories) and crash recovery.
 *
 * Time is injectable (`wait`) so tests run deterministically.
 */

/* eslint-disable no-param-reassign */ // the scheduler mutates the job tree in place

import { NodeStatus, PostErrorKind, PostRecordResumeMode } from '@postybirb/types';
import { CancellableToken } from '../models/cancellable-token';
import { DEPENDENCY_STATES, SKIP_REASONS, TRACER_JOB_EVENTS, TRACER_TASK_EVENTS } from './constants';
import { StageError, classify, decideRetry, toTaskError } from './errors';
import {
  RelayJob,
  RelayTask,
  TERMINAL_ALL,
  computeJobStatus,
  evaluateDependency,
} from './model';
import { PipelineDeps, planJob, resetForResume, runTaskPass } from './pipeline';

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

const realWait = (ms: number) =>
  new Promise<void>((r) => {
    setTimeout(r, ms);
  });

export class RelayScheduler {
  private readonly deps: PipelineDeps;

  private readonly opts: Required<Omit<SchedulerOptions, 'wait' | 'onTaskChanged' | 'onJobChanged'>>;

  private readonly wait: (ms: number) => Promise<void>;

  private readonly onTaskChanged?: (job: RelayJob, task: RelayTask) => void | Promise<void>;

  private readonly onJobChanged?: (job: RelayJob) => void | Promise<void>;

  private readonly jobs = new Map<string, RelayJob>();

  private readonly tokens = new Map<string, CancellableToken>();

  /**
   * Small, insertion-ordered LRU of recently-completed job trees. Once a job
   * reaches a terminal state the manager calls {@link forget} to drop it from
   * the live `jobs` map (otherwise it would be retained for the life of the
   * process — an unbounded leak). We keep the most recent few here so a
   * just-finished job is still resolvable by {@link getJob} (e.g. a UI request
   * landing right after completion) without re-reading the database; older
   * entries are evicted. Persistent history always comes from the DB.
   */
  private readonly recentlyCompleted = new Map<string, RelayJob>();

  private readonly maxRecentlyCompleted = 50;

  constructor(deps: PipelineDeps, opts?: Partial<SchedulerOptions>) {
    this.deps = deps;
    this.opts = {
      maxConcurrentJobs: opts?.maxConcurrentJobs ?? 2,
      maxConcurrentTasks: opts?.maxConcurrentTasks ?? 4,
    };
    this.wait = opts?.wait ?? realWait;
    this.onTaskChanged = opts?.onTaskChanged;
    this.onJobChanged = opts?.onJobChanged;
  }

  /** Register an already-planned (or recovered) job without re-planning it. */
  adopt(job: RelayJob): void {
    this.recentlyCompleted.delete(job.id);
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
    this.recentlyCompleted.delete(jobId);
  }

  /**
   * Drop a terminal job from the live working set to bound memory. The job is
   * moved into the bounded recently-completed cache so a brief follow-up lookup
   * still resolves it. No-op if the job is unknown or still non-terminal.
   */
  forget(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (!job || !TERMINAL_ALL.has(job.status)) return;
    this.jobs.delete(jobId);
    this.tokens.delete(jobId);
    this.recentlyCompleted.set(jobId, job);
    while (this.recentlyCompleted.size > this.maxRecentlyCompleted) {
      const oldest = this.recentlyCompleted.keys().next().value;
      if (oldest === undefined) break;
      this.recentlyCompleted.delete(oldest);
    }
  }

  private async persistJob(job: RelayJob): Promise<void> {
    if (this.onJobChanged) await this.onJobChanged(job);
  }

  /**
   * Persist a task, retrying a few times on failure (SQLite write locks are
   * common under concurrency). Crucially this NEVER throws: a persistence
   * failure must not propagate into the task error-handling path, because the
   * post may already have gone out — letting a DB error flip a SUCCEEDED unit
   * back to a re-postable state would cause a duplicate post on resume.
   * Returns true if the write ultimately succeeded.
   */
  private async persistTaskDurable(
    job: RelayJob,
    task: RelayTask,
  ): Promise<boolean> {
    if (!this.onTaskChanged) return true;
    const maxAttempts = 5;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await this.onTaskChanged(job, task);
        return true;
      } catch (err) {
        if (attempt === maxAttempts) {
          this.deps.tracer.emit({
            jobId: job.id,
            taskId: task.id,
            account: task.accountId,
            website: task.websiteId,
            level: 'error',
            event: TRACER_TASK_EVENTS.PERSIST_FAILED,
            data: {
              message: String((err as Error)?.message ?? err),
              taskStatus: task.status,
              units: task.units.map((u) => ({ id: u.id, status: u.status })),
            },
          });
          return false;
        }
        // eslint-disable-next-line no-await-in-loop
        await this.wait(50 * 2 ** (attempt - 1));
      }
    }
    return false;
  }

  /** Create and register a job WITHOUT planning it (caller must prepare deps). */
  createJob(
    submissionId: string,
    opts?: {
      priority?: number;
      scheduledFor?: number;
      resumeMode?: PostRecordResumeMode;
    },
  ): RelayJob {
    const job = new RelayJob({
      submissionId,
      priority: opts?.priority,
      scheduledFor: opts?.scheduledFor,
      resumeMode: opts?.resumeMode ?? PostRecordResumeMode.NEW,
    });
    this.recentlyCompleted.delete(job.id);
    this.jobs.set(job.id, job);
    // Create the cancellation token immediately so cancel() can interrupt the job
    // even before runJob is invoked, eliminating the race window.
    const token = new CancellableToken();
    this.tokens.set(job.id, token);
    return job;
  }

  /** Plan an already-created job (build its task/unit tree). */
  plan(job: RelayJob): void {
    planJob(job, this.deps);
    this.deps.tracer.emit({
      jobId: job.id,
      level: 'info',
      event: TRACER_JOB_EVENTS.ENQUEUED,
      data: {
        submissionId: job.submissionId,
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
      priority?: number;
      scheduledFor?: number;
      resumeMode?: PostRecordResumeMode;
    },
  ): RelayJob {
    const job = this.createJob(submissionId, opts);
    this.plan(job);
    return job;
  }

  resume(jobId: string, mode: PostRecordResumeMode): RelayJob {
    const job = this.jobs.get(jobId) ?? this.recentlyCompleted.get(jobId);
    if (!job) throw new Error(`unknown job ${jobId}`);
    // A resumed job is live again: pull it back out of the completed cache.
    this.recentlyCompleted.delete(jobId);
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
    return this.jobs.get(jobId) ?? this.recentlyCompleted.get(jobId);
  }

  /** Run all due jobs to completion (or terminal failure). */
  async runToIdle(startNow = Date.now()): Promise<void> {
    let now = startNow;
    for (;;) {
      const cutoff = now;
      const due = [...this.jobs.values()]
        .filter(
          (j) =>
            !TERMINAL_ALL.has(j.status) &&
            (j.scheduledFor === undefined || j.scheduledFor <= cutoff),
        )
        .sort((a, b) => b.priority - a.priority || a.createdAt - b.createdAt);

      if (due.length === 0) return;

      const batch = due.slice(0, this.opts.maxConcurrentJobs);
      // eslint-disable-next-line no-await-in-loop
      await Promise.all(batch.map((job) => this.runJob(job)));
      now = Date.now();
    }
  }

  /**
   * Sleep for `ms`, but resolve early if the token is cancelled so a pending
   * rate-limit/backoff wait does not force the user to sit through a long
   * window after pressing cancel. Returns the (possibly shortened) actual
   * elapsed intent; callers re-check `token.isCancelled` after awaiting.
   */
  private async interruptibleWait(
    ms: number,
    token: CancellableToken,
  ): Promise<void> {
    if (token.isCancelled || ms <= 0) return;
    let unsubscribe: (() => void) | undefined;
    await Promise.race([
      this.wait(ms),
      new Promise<void>((resolve) => {
        unsubscribe = token.onCancel(resolve);
      }),
    ]);
    unsubscribe?.();
  }

  private async runJob(job: RelayJob): Promise<void> {
    job.status = NodeStatus.RUNNING;
    await this.persistJob(job);
    const token = this.tokens.get(job.id);
    if (!token) {
      throw new Error(`Job ${job.id} has no cancellation token; createJob was not called`);
    }

    try {
      for (;;) {
        if (token.isCancelled) break;

        const pending = job.tasks.filter((t) => !TERMINAL_ALL.has(t.status));
        if (pending.length === 0) break;

        const runnable = pending.filter((t) => this.isRunnable(job, t, Date.now()));

        if (runnable.length === 0) {
          const soonest = this.soonestWakeup(job);
          if (soonest === undefined) {
            this.skipBlockedDependents(job);
            // eslint-disable-next-line no-await-in-loop
            await this.persistJob(job);
            continue;
          }
          // eslint-disable-next-line no-await-in-loop
          await this.interruptibleWait(Math.max(0, soonest - Date.now()), token);
          continue;
        }

        const slice = runnable.slice(0, this.opts.maxConcurrentTasks);
        // eslint-disable-next-line no-await-in-loop
        await Promise.all(
          slice.map((t) => this.runTaskWithRetries(job, t, token)),
        );
      }

      // A cancel can break the loop with tasks still parked in WAITING/QUEUED
      // (e.g. mid rate-limit window). Mark every remaining non-terminal task
      // CANCELLED so the job settles to a terminal state instead of being
      // computed as still WAITING/RUNNING.
      if (token.isCancelled) this.cancelRemainingTasks(job);

      job.status = computeJobStatus(job);
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

  private isRunnable(job: RelayJob, task: RelayTask, now: number): boolean {
    if (TERMINAL_ALL.has(task.status)) return false;
    if (task.waitingUntil !== undefined && task.waitingUntil > now) return false;
    const dep = evaluateDependency(job, task);
    return dep === DEPENDENCY_STATES.SATISFIED || dep === DEPENDENCY_STATES.NONE;
  }

  private soonestWakeup(job: RelayJob): number | undefined {
    let soonest: number | undefined;
    let anyDepPending = false;
    for (const t of job.tasks) {
      if (TERMINAL_ALL.has(t.status)) continue;
      if (t.waitingUntil !== undefined) {
        soonest =
          soonest === undefined ? t.waitingUntil : Math.min(soonest, t.waitingUntil);
      } else if (evaluateDependency(job, t) === DEPENDENCY_STATES.PENDING) {
        anyDepPending = true;
      }
    }
    if (soonest !== undefined) return soonest;
    return anyDepPending ? Date.now() + 5 : undefined;
  }

  private skipBlockedDependents(job: RelayJob): void {
    for (const t of job.tasks) {
      if (TERMINAL_ALL.has(t.status)) continue;
      if (evaluateDependency(job, t) === DEPENDENCY_STATES.BLOCKED) {
        t.status = NodeStatus.SKIPPED;
        this.deps.tracer.emit({
          jobId: job.id,
          taskId: t.id,
          level: 'warn',
          event: TRACER_TASK_EVENTS.SKIPPED,
          data: { reason: SKIP_REASONS.DEPENDENCY_UNREACHABLE },
        });
      }
    }
  }

  /** Mark every non-terminal task CANCELLED (used on a cancelled job exit). */
  private cancelRemainingTasks(job: RelayJob): void {
    for (const t of job.tasks) {
      if (TERMINAL_ALL.has(t.status)) continue;
      t.status = NodeStatus.CANCELLED;
      t.waitingUntil = undefined;
      for (const unit of t.units) {
        if (!TERMINAL_ALL.has(unit.status)) unit.status = NodeStatus.CANCELLED;
      }
      this.deps.tracer.emit({
        jobId: job.id,
        taskId: t.id,
        account: t.accountId,
        website: t.websiteId,
        level: 'warn',
        event: TRACER_TASK_EVENTS.CANCELLED,
      });
    }
  }

  private async runTaskWithRetries(
    job: RelayJob,
    task: RelayTask,
    token: CancellableToken,
  ): Promise<void> {
    task.status = NodeStatus.RUNNING;
    task.waitingUntil = undefined;
    this.deps.tracer.emit({
      jobId: job.id,
      taskId: task.id,
      account: task.accountId,
      website: task.websiteId,
      level: 'info',
      event: TRACER_TASK_EVENTS.STARTED,
      data: { attempt: task.attempts + 1 },
    });

    let passError: unknown;
    try {
      await runTaskPass(this.deps, job, task, token);
    } catch (err) {
      passError = err;
    }

    // Success path: the units are SUCCEEDED in memory and the post(s) already
    // went out. Persist durably, but a persistence failure here must NOT be
    // treated as a task failure (that would re-open the unit and double-post
    // on resume). Keep the SUCCEEDED state; persist_failed is logged loudly.
    if (passError === undefined) {
      await this.persistTaskDurable(job, task);
      return;
    }

    const se: StageError =
      passError instanceof StageError
        ? passError
        : classify('unknown', passError);

    if (se.kind === PostErrorKind.RATE_LIMITED) {
      task.status = NodeStatus.WAITING; // waitingUntil set in the gate stage
      await this.persistTaskDurable(job, task);
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
        event: TRACER_TASK_EVENTS.RETRY,
        data: { kind: se.kind, delayMs: decision.delayMs, attempt: task.attempts },
      });
      await this.persistTaskDurable(job, task);
      await this.interruptibleWait(decision.delayMs, token);
      if (token.isCancelled) {
        task.status = NodeStatus.CANCELLED;
        task.error = toTaskError(se);
        await this.persistTaskDurable(job, task);
        this.deps.tracer.pushTaskDelta(job, task);
        return;
      }
      await this.runTaskWithRetries(job, task, token);
      return;
    }

    task.status = token.isCancelled ? NodeStatus.CANCELLED : NodeStatus.FAILED;
    task.error = toTaskError(se);
    await this.persistTaskDurable(job, task);
    this.deps.tracer.emit({
      jobId: job.id,
      taskId: task.id,
      account: task.accountId,
      website: task.websiteId,
      level: 'error',
      event: TRACER_TASK_EVENTS.FAILED,
      data: { kind: se.kind, stage: se.stage, message: se.message },
    });
    this.deps.tracer.pushTaskDelta(job, task);
  }
}
