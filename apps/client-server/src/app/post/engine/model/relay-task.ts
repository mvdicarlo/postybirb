/**
 * Relay engine — RelayTask working-tree node + its dependency-gate logic.
 */

import {
    AccountId,
    Dependency,
    EntityId,
    ITaskError,
    NodeStatus,
} from '@postybirb/types';
import { v4 } from 'uuid';
import { DEPENDENCY_STATES, SOURCE_DEPENDENCY_MODES } from '../constants';
import { isTerminal } from './node-status';
import type { RelayJob } from './relay-job';
import { RelayUnit } from './relay-unit';

/** Result of evaluating a task's source-URL dependency gate. */
export type DependencyState = 'none' | 'satisfied' | 'pending' | 'blocked';

/**
 * A single (website, account) destination for a job. Carries the per-target
 * retry counter, optional dependency gate (e.g. "wait for the standard sites
 * to post first so you can quote their source URLs"), and the ordered list
 * of units that physically dispatch the work. The task's own `status` is the
 * roll-up the scheduler reads when deciding what to run next.
 */
export class RelayTask {
  id: EntityId;
  jobId: EntityId;
  accountId: AccountId;
  websiteId: string;
  dependency?: Dependency;
  status: NodeStatus;
  attempts: number;
  maxAttempts: number;
  sourceUrl?: string;
  message?: string;
  error?: ITaskError;
  waitingUntil?: number;
  /**
   * Wall-clock time (ms) at which this task first parked on a rate-limit gate
   * in the current run. Used to enforce a cumulative wait ceiling so a task on
   * a busy shared bucket cannot be starved indefinitely. In-memory only; reset
   * once the task makes forward progress (a unit posts).
   */
  parkedSince?: number;
  units: RelayUnit[];

  constructor(init: {
    id?: EntityId;
    jobId: EntityId;
    accountId: AccountId;
    websiteId: string;
    dependency?: Dependency;
    maxAttempts?: number;
  }) {
    this.id = init.id ?? v4();
    this.jobId = init.jobId;
    this.accountId = init.accountId;
    this.websiteId = init.websiteId;
    this.dependency = init.dependency;
    this.status = NodeStatus.QUEUED;
    this.attempts = 0;
    this.maxAttempts = init.maxAttempts ?? 3;
    this.units = [];
  }

  /** The upstream task ids this task's source-URL gate depends on (empty if none). */
  get dependencyTaskIds(): EntityId[] {
    return this.dependency?.tasks ?? [];
  }

  /**
   * Evaluate this task's source-URL dependency gate against its job tree.
   *  - 'none'      : no dependency declared.
   *  - 'satisfied' : the gate is met; the task may run.
   *  - 'pending'   : not yet met, but still reachable.
   *  - 'blocked'   : can never be met -> the task should be SKIPPED.
   *
   * SKIPPED upstreams count as "done" for 'all' but not as a success for
   * 'any'/'count'. The 'allSettled' mode is best-effort: it waits for every
   * upstream to settle (any outcome) and is never blocked — a failed upstream
   * simply yields no source URL rather than skipping the dependent.
   */
  evaluateDependency(job: RelayJob): DependencyState {
    const dep = this.dependency;
    if (!dep || dep.tasks.length === 0) return DEPENDENCY_STATES.NONE;

    const deps = dep.tasks
      .map((id) => job.tasks.find((t) => t.id === id))
      .filter((t): t is RelayTask => !!t);
    if (deps.length === 0) return DEPENDENCY_STATES.NONE;

    const succeeded = deps.filter(
      (t) => t.status === NodeStatus.SUCCEEDED,
    ).length;
    const skipped = deps.filter((t) => t.status === NodeStatus.SKIPPED).length;
    const terminal = deps.filter((t) => isTerminal(t)).length;
    const total = deps.length;

    if (dep.mode === SOURCE_DEPENDENCY_MODES.ALL_SETTLED) {
      // Best-effort: post once every upstream has settled, whatever the
      // outcome. Never blocked — a failed upstream just contributes no URL.
      return terminal === total
        ? DEPENDENCY_STATES.SATISFIED
        : DEPENDENCY_STATES.PENDING;
    }

    if (dep.mode === SOURCE_DEPENDENCY_MODES.ALL) {
      if (succeeded + skipped === total) return DEPENDENCY_STATES.SATISFIED;
      const terminalNotDone = terminal - succeeded - skipped;
      if (terminalNotDone > 0) return DEPENDENCY_STATES.BLOCKED;
      return DEPENDENCY_STATES.PENDING;
    }

    const need = dep.mode === SOURCE_DEPENDENCY_MODES.COUNT ? dep.n : 1; // 'any' === count 1
    if (succeeded >= need) return DEPENDENCY_STATES.SATISFIED;
    const stillPossible = total - (terminal - succeeded);
    if (stillPossible < need) return DEPENDENCY_STATES.BLOCKED;
    return DEPENDENCY_STATES.PENDING;
  }
}
