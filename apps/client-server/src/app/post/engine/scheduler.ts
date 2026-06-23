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

import { NodeStatus, PostRecordResumeMode } from '@postybirb/types';
import { CancellableToken } from '../models/cancellable-token';
import { DEPENDENCY_STATES, SKIP_REASONS, TRACER_JOB_EVENTS, TRACER_TASK_EVENTS } from './constants';
import { StageError, classify, decideRetry, toTaskError } from './errors';
import {
    RelayJob,
    RelayTask,
    computeJobStatus,
    evaluateDependency,
    isTerminal,
} from './model';
import { PipelineDeps, TaskPassResult, planJob, resetForResume, runTaskPass } from './pipeline';
import { taskTraceFields } from './tracer.service';

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

  /**
   * The live working set: only non-terminal (or just-completed-awaiting-forget)
   * job trees the scheduler is actively running. This is the single in-memory
   * index of "what is running" — the manager derives activeBySubmission from it
   * rather than keeping a parallel map. Terminal jobs are dropped via
   * {@link forget}; their durable record (and all history) lives in the DB.
   */
  private readonly jobs = new Map<string, RelayJob>();

  private readonly tokens = new Map<string, CancellableToken>();

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
   * tracked. Replaces the manager's parallel `activeBySubmission` map: the live
   * `jobs` set already is the index of what's running.
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
            ...taskTraceFields(job, task),
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
      resumeMode?: PostRecordResumeMode;
    },
  ): RelayJob {
    const job = new RelayJob({
      submissionId,
      resumeMode: opts?.resumeMode ?? PostRecordResumeMode.NEW,
    });
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
      // eslint-disable-next-line no-await-in-loop
      await Promise.all(batch.map((job) => this.runJob(job)));
    }
  }

  /**
   * Sleep for `ms`, but resolve early if the token's signal aborts so a pending
   * rate-limit/backoff wait does not force the user to sit through a long
   * window after pressing cancel. The actual sleep stays injectable via
   * `this.wait` (kept deterministic in tests); the AbortSignal only races it.
   * Callers re-check `token.isCancelled` after awaiting.
   */
  private async interruptibleWait(
    ms: number,
    signal: AbortSignal,
  ): Promise<void> {
    if (signal.aborted || ms <= 0) return;
    let onAbort: (() => void) | undefined;
    try {
      await Promise.race([
        this.wait(ms),
        new Promise<void>((resolve) => {
          onAbort = () => resolve();
          signal.addEventListener('abort', onAbort, { once: true });
        }),
      ]);
    } finally {
      if (onAbort) signal.removeEventListener('abort', onAbort);
    }
  }

  private async runJob(job: RelayJob): Promise<void> {
    job.status = NodeStatus.RUNNING;
    await this.persistJob(job);
    const token = this.tokens.get(job.id);
    if (!token) {
      throw new Error(`Job ${job.id} has no cancellation token; createJob was not called`);
    }
    // Seed the UI posting-state store with the active job immediately. Without
    // this, early task/unit deltas can arrive before the client knows the job
    // root and get dropped.
    this.deps.tracer.pushJobDelta(job);

    try {
      // Main run loop. Each iteration either runs a batch of tasks, sleeps
      // until something becomes runnable, or terminates the loop because all
      // tasks are terminal or the job has been cancelled.
      for (;;) {
        if (token.isCancelled) break;

        const pending = job.tasks.filter((t) => !isTerminal(t));
        if (pending.length === 0) break;

        const runnable = pending.filter((t) => this.isRunnable(job, t, Date.now()));

        if (runnable.length === 0) {
          // Nothing can run right now. Either everyone is parked on a
          // wait/dependency gate (sleep until the soonest gate releases) or
          // some tasks are dependency-BLOCKED (their upstreams can never
          // satisfy them) — mark those SKIPPED and loop so any newly-unblocked
          // dependents can be evaluated.
          const soonest = this.soonestWakeup(job);
          if (soonest === undefined) {
            this.skipBlockedDependents(job);
            // eslint-disable-next-line no-await-in-loop
            await this.persistJob(job);
            continue;
          }
          // eslint-disable-next-line no-await-in-loop
          await this.interruptibleWait(Math.max(0, soonest - Date.now()), token.signal);
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
    if (isTerminal(task)) return false;
    if (task.waitingUntil !== undefined && task.waitingUntil > now) return false;
    const dep = evaluateDependency(job, task);
    return dep === DEPENDENCY_STATES.SATISFIED || dep === DEPENDENCY_STATES.NONE;
  }

  private soonestWakeup(job: RelayJob): number | undefined {
    let soonest: number | undefined;
    let anyDepPending = false;
    for (const t of job.tasks) {
      if (isTerminal(t)) continue;
      if (t.waitingUntil !== undefined) {
        soonest =
          soonest === undefined ? t.waitingUntil : Math.min(soonest, t.waitingUntil);
      } else if (evaluateDependency(job, t) === DEPENDENCY_STATES.PENDING) {
        anyDepPending = true;
      }
    }
    if (soonest !== undefined) return soonest;
    // A dependency is pending but no task has an absolute wakeup time — the
    // gate will only release when another task completes. Return a near-zero
    // "nudge" so the outer loop yields to the event loop (giving the
    // currently-running tasks a chance to finish) and then re-evaluates,
    // rather than spinning hot on a tight while-true.
    return anyDepPending ? Date.now() + 5 : undefined;
  }

  private skipBlockedDependents(job: RelayJob): void {
    for (const t of job.tasks) {
      if (isTerminal(t)) continue;
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
      if (isTerminal(t)) continue;
      t.status = NodeStatus.CANCELLED;
      t.waitingUntil = undefined;
      for (const unit of t.units) {
        if (!isTerminal(unit)) unit.status = NodeStatus.CANCELLED;
      }
      this.deps.tracer.emit({
        ...taskTraceFields(job, t),
        level: 'warn',
        event: TRACER_TASK_EVENTS.CANCELLED,
      });
    }
  }

  /**
   * Drive one task through a pipeline pass and apply the typed-error retry
   * policy. Recurses (a "trampoline" tail-call) on a TRANSIENT retry so the
   * second attempt re-uses this same method and benefits from the same
   * persistence/cancel-on-wait handling — the recursion depth is bounded by
   * `task.maxAttempts` (default 3) so stack growth is not a concern.
   */
  private async runTaskWithRetries(
    job: RelayJob,
    task: RelayTask,
    token: CancellableToken,
  ): Promise<void> {
    task.status = NodeStatus.RUNNING;
    task.waitingUntil = undefined;
    this.deps.tracer.emit({
      ...taskTraceFields(job, task),
      level: 'info',
      event: TRACER_TASK_EVENTS.STARTED,
      data: { attempt: task.attempts + 1 },
    });

    let passResult: TaskPassResult | undefined;
    let passError: unknown;
    try {
      passResult = await runTaskPass(this.deps, job, task, token);
    } catch (err) {
      passError = err;
    }
    // No error thrown: the pass either completed (units SUCCEEDED, post(s)
    // already went out) or asked to park on a rate-limit gate. In both cases a
    // persistence failure must NOT be treated as a task failure (that would
    // re-open the unit and double-post on resume) — keep the in-memory state;
    // persist_failed is logged loudly.
    if (passError === undefined) {
      if (passResult?.outcome === 'rate_limited') {
        task.status = NodeStatus.WAITING; // waitingUntil set in the gate stage
        await this.persistTaskDurable(job, task);
        this.deps.tracer.pushTaskDelta(job, task);
        return;
      }
      await this.persistTaskDurable(job, task);
      return;
    }

    const se: StageError =
      passError instanceof StageError
        ? passError
        : classify('unknown', passError);

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
      await this.interruptibleWait(decision.delayMs, token.signal);
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
      ...taskTraceFields(job, task),
      level: 'error',
      event: TRACER_TASK_EVENTS.FAILED,
      data: { kind: se.kind, stage: se.stage, message: se.message },
    });
    this.deps.tracer.pushTaskDelta(job, task);
  }
}
