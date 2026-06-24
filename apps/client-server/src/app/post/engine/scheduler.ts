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
import fastq from 'fastq';
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

/**
 * Mutable per-run state for a job's task reactor (see {@link RelayScheduler.runReactor}).
 * Holds the fastq task queue, the set of tasks currently owned by the reactor
 * (in-flight, queued for a slot, or parked on a timer), the in-flight worker
 * count, cancel/settle flags, and the promise resolver that ends the run.
 */
interface RunCtx {
  job: RelayJob;
  token: CancellableToken;
  queue: fastq.queueAsPromised<RelayTask, void>;
  active: Set<string>;
  inFlight: number;
  cancelled: boolean;
  settled: boolean;
  resolve: () => void;
}

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
      // Event-driven reactor: tasks are dispatched through a fastq queue as
      // their dependency/rate-limit gates open. It
      // resolves once every task is terminal (or the job was cancelled and the
      // remainder force-settled).
      await this.runReactor(job, token);

      // A cancel can leave tasks parked in WAITING/QUEUED (e.g. mid rate-limit
      // window). Mark every remaining non-terminal task CANCELLED so the job
      // settles terminal instead of computing as still WAITING/RUNNING.
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

  /**
   * Drive a job's task tree to completion as an event-driven reactor.
   *
   * A {@link fastq} queue (concurrency = maxConcurrentTasks) dispatches a task
   * the moment it becomes runnable; completion events re-evaluate dependents
   * (source-URL gates) and rate-limit parks re-arm via an abortable timer.
   * There is no polling: each non-terminal task is always either in-flight,
   * queued for a free slot, parked on a timer, or waiting for an upstream
   * settle to re-pump it. Resolves when all tasks are terminal, or promptly on
   * cancel after in-flight work drains.
   */
  private runReactor(job: RelayJob, token: CancellableToken): Promise<void> {
    return new Promise<void>((resolve) => {
      let ctx: RunCtx;
      const worker = async (task: RelayTask): Promise<void> => {
        ctx.inFlight += 1;
        try {
          await this.runTaskWithRetries(job, task, token);
        } catch {
          // runTaskWithRetries is designed never to throw; guard fastq anyway.
          if (!isTerminal(task)) task.status = NodeStatus.FAILED;
        } finally {
          ctx.inFlight -= 1;
          this.afterTask(ctx, task);
        }
      };
      const queue = fastq.promise<unknown, RelayTask, void>(
        worker,
        this.opts.maxConcurrentTasks,
      );
      ctx = {
        job,
        token,
        queue,
        active: new Set<string>(),
        inFlight: 0,
        cancelled: false,
        settled: false,
        resolve,
      };

      if (token.isCancelled) {
        this.onCancel(ctx);
        return;
      }
      token.signal.addEventListener('abort', () => this.onCancel(ctx), {
        once: true,
      });
      this.pump(ctx);
    });
  }

  /**
   * Schedule every currently-runnable task and skip any that are permanently
   * dependency-blocked, repeating until the ready set is stable. Called once at
   * start and after each task settles (so newly-unblocked dependents are picked
   * up). Pure bookkeeping over the small task set — not a wall-clock poll.
   */
  private pump(ctx: RunCtx): void {
    if (ctx.cancelled || ctx.settled) return;
    const { job } = ctx;
    let changed = true;
    while (changed) {
      changed = false;
      for (const task of job.tasks) {
        if (isTerminal(task) || ctx.active.has(task.id)) continue;
        if (task.waitingUntil !== undefined && task.waitingUntil > Date.now()) {
          continue; // parked; its timer owns re-scheduling
        }
        const dep = evaluateDependency(job, task);
        if (
          dep === DEPENDENCY_STATES.SATISFIED ||
          dep === DEPENDENCY_STATES.NONE
        ) {
          ctx.active.add(task.id);
          ctx.queue.push(task).catch(() => undefined);
          changed = true;
        } else if (dep === DEPENDENCY_STATES.BLOCKED) {
          this.skipBlockedTask(job, task);
          changed = true; // its dependents may now be (un)blocked
        }
        // PENDING: leave it; an upstream settle will re-pump.
      }
    }
    this.checkDone(ctx);
  }

  /** Worker-completion handler: re-arm a rate-limit park, or propagate a settle. */
  private afterTask(ctx: RunCtx, task: RelayTask): void {
    ctx.active.delete(task.id);
    if (ctx.cancelled) {
      if (ctx.inFlight === 0) this.finishCancelled(ctx);
      return;
    }
    if (task.status === NodeStatus.WAITING) {
      this.scheduleParkTimer(ctx, task);
      return;
    }
    this.pump(ctx);
  }

  /**
   * Re-arm a rate-limit-parked task: wait out its `waitingUntil` window (via the
   * injectable, abortable wait) then re-pump it. The remaining window is
   * re-checked against the clock rather than re-running the (expensive)
   * pipeline pass, so an instant injected wait in tests does not repeatedly
   * re-dispatch the task.
   */
  private scheduleParkTimer(ctx: RunCtx, task: RelayTask): void {
    ctx.active.add(task.id); // keep the task owned while parked
    const tick = (): void => {
      if (ctx.cancelled || ctx.settled) {
        ctx.active.delete(task.id);
        return;
      }
      const remaining = (task.waitingUntil ?? 0) - Date.now();
      if (remaining > 0) {
        this.interruptibleWait(remaining, ctx.token.signal)
          .then(tick)
          .catch(() => undefined);
        return;
      }
      ctx.active.delete(task.id);
      this.pump(ctx);
    };
    tick();
  }

  /** Mark a permanently dependency-blocked task SKIPPED (and persist it). */
  private skipBlockedTask(job: RelayJob, task: RelayTask): void {
    task.status = NodeStatus.SKIPPED;
    this.deps.tracer.emit({
      jobId: job.id,
      taskId: task.id,
      level: 'warn',
      event: TRACER_TASK_EVENTS.SKIPPED,
      data: { reason: SKIP_REASONS.DEPENDENCY_UNREACHABLE },
    });
    this.deps.tracer.pushTaskDelta(job, task);
    this.persistTaskDurable(job, task).catch(() => undefined);
  }

  /** Resolve the reactor once every task has reached a terminal state. */
  private checkDone(ctx: RunCtx): void {
    if (ctx.settled || ctx.cancelled) return;
    if (ctx.job.tasks.every((t) => isTerminal(t))) {
      ctx.settled = true;
      ctx.resolve();
    }
  }

  /** Begin cancellation: stop scheduling, drop queued work, settle when idle. */
  private onCancel(ctx: RunCtx): void {
    if (ctx.cancelled) return;
    ctx.cancelled = true;
    ctx.queue.kill(); // drop not-yet-started tasks; in-flight workers finish
    if (ctx.inFlight === 0) this.finishCancelled(ctx);
  }

  /** Force-settle the reactor after a cancel once in-flight work has drained. */
  private finishCancelled(ctx: RunCtx): void {
    if (ctx.settled) return;
    ctx.settled = true;
    this.cancelRemainingTasks(ctx.job);
    ctx.resolve();
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
