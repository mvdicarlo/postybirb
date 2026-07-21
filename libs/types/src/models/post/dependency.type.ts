import { TaskId } from './post-task.interface';

/**
 * How a task's source-URL dependency gate is satisfied before it may post.
 *  - 'all'        : every listed task must be terminal-DONE (SUCCEEDED/SKIPPED);
 *                   a FAILED/CANCELLED upstream BLOCKS (skips) the dependent.
 *  - 'allSettled' : best-effort (default for external-source sites). Wait until
 *                   every listed task is terminal (any outcome) then post
 *                   regardless; a failed upstream simply contributes no source
 *                   URL. Never blocks the dependent.
 *  - 'any'        : unblock as soon as >= 1 listed task SUCCEEDS (post sooner
 *                   with whatever upstream URLs exist so far)
 *  - 'count'      : unblock once >= n listed tasks SUCCEED
 *
 * A task with no dependency runs immediately.
 */
export type Dependency =
  | { mode: 'all'; tasks: TaskId[] }
  | { mode: 'allSettled'; tasks: TaskId[] }
  | { mode: 'any'; tasks: TaskId[] }
  | { mode: 'count'; tasks: TaskId[]; n: number };

/**
 * The mode a website declares for how many upstream source URLs it needs
 * before it may post. Mapped to a {@link Dependency} at job-planning time.
 * Defaults to 'allSettled' (best-effort) for external-source sites.
 */
export type SourceDependencyMode =
  | 'all'
  | 'allSettled'
  | 'any'
  | { count: number };

/**
 * What a rate-limit window is keyed by for a website.
 *  - 'account'        : per login (default; most sites)
 *  - 'website'        : global across all accounts on this website
 *  - 'website+account': both (rare; e.g. shared IP + per-user limits)
 */
export type RateLimitScope = 'account' | 'website' | 'website+account';
