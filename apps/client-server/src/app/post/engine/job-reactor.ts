/**
 * Relay engine — per-job task reactor.
 *
 * Runs ONE job's task tree to a terminal state as an event-driven reactor: a
 * {@link fastq} queue (concurrency = maxConcurrentTasks) dispatches a task the
 * moment its dependency/rate-limit gates open; completion events re-evaluate
 * dependents and rate-limit parks re-arm via an abortable timer. There is no
 * polling. Also owns the per-task staged pass + typed-error retry policy and
 * the durable per-task persistence.
 *
 * The owning {@link RelayScheduler} provides job-level concurrency, the job
 * registry, and job-level persistence; it constructs one reactor and calls
 * {@link JobReactor.run} per job.
 *
 * Time is injectable (`wait`) so tests run deterministically.
 */

/* eslint-disable no-param-reassign */ // the reactor mutates the job tree in place

import { NodeStatus } from '@postybirb/types';
import fastq from 'fastq';
import { CancellableToken } from '../models/cancellable-token';
import {
    DEPENDENCY_STATES,
    SKIP_REASONS,
    TRACER_TASK_EVENTS,
} from './constants';
import { StageError, classify, decideRetry, toTaskError } from './errors';
import { RelayJob, RelayTask, isTerminal } from './model';
import { PipelineDeps, TaskPassResult, runTaskPass } from './pipeline';
import { taskTraceFields } from './tracer.service';

export interface JobReactorOptions {
  maxConcurrentTasks: number;
  /** real wait by default; override for deterministic tests */
  wait?: (ms: number) => Promise<void>;
  /** invoked after a task transition so callers can persist the subtree */
  onTaskChanged?: (job: RelayJob, task: RelayTask) => void | Promise<void>;
}

const realWait = (ms: number) =>
  new Promise<void>((r) => {
    setTimeout(r, ms);
  });

/**
 * Mutable per-run state for a job's task reactor. Holds the fastq task queue,
 * the set of tasks currently owned by the reactor (in-flight, queued for a
 * slot, or parked on a timer), the in-flight worker count, cancel/settle flags,
 * and the promise resolver that ends the run.
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

export class JobReactor {
  private readonly deps: PipelineDeps;

  private readonly maxConcurrentTasks: number;

  private readonly wait: (ms: number) => Promise<void>;

  private readonly onTaskChanged?: (
    job: RelayJob,
    task: RelayTask,
  ) => void | Promise<void>;

  constructor(deps: PipelineDeps, opts: JobReactorOptions) {
    this.deps = deps;
    this.maxConcurrentTasks = opts.maxConcurrentTasks;
    this.wait = opts.wait ?? realWait;
    this.onTaskChanged = opts.onTaskChanged;
  }

  /**
   * Drive a job's task tree to completion. A {@link fastq} queue dispatches a
   * task the moment it becomes runnable; completion events re-evaluate
   * dependents (source-URL gates) and rate-limit parks re-arm via an abortable
   * timer. Each non-terminal task is always either in-flight, queued for a free
   * slot, parked on a timer, or waiting for an upstream settle to re-pump it.
   * Resolves when all tasks are terminal, or promptly on cancel after in-flight
   * work drains.
   */
  run(job: RelayJob, token: CancellableToken): Promise<void> {
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
        this.maxConcurrentTasks,
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
        const dep = task.evaluateDependency(job);
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
