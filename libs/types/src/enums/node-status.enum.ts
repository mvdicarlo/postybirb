/**
 * Lifecycle state shared by every node in a post job tree
 * (PostJob, PostTask, PostUnit).
 *
 * Resume re-runs any node not in a "terminal-done" state
 * ({@link NodeStatus.SUCCEEDED}, {@link NodeStatus.SKIPPED}).
 * @enum {string}
 */
export enum NodeStatus {
  /** Created, not yet eligible to run. */
  QUEUED = 'QUEUED',
  /** Eligible to run (dependencies satisfied, not rate-limited). */
  READY = 'READY',
  /** Actively executing. */
  RUNNING = 'RUNNING',
  /** Parked on a rate-limit window or a dependency gate. */
  WAITING = 'WAITING',
  /** Completed successfully. Terminal-done. */
  SUCCEEDED = 'SUCCEEDED',
  /** Failed terminally. */
  FAILED = 'FAILED',
  /** Intentionally not run (e.g. file excluded, type unsupported). Terminal-done. */
  SKIPPED = 'SKIPPED',
  /** Cancelled by the user or a shutdown. */
  CANCELLED = 'CANCELLED',
}
