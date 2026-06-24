/**
 * Relay engine constants — centralized magic strings.
 *
 * Avoids scattering string literals throughout the codebase, making refactors
 * and audits easier. Also serves as documentation of all event/state types.
 */

/** Dependency evaluation states (see {@link DependencyState}). */
export const DEPENDENCY_STATES = {
  NONE: 'none' as const,
  SATISFIED: 'satisfied' as const,
  PENDING: 'pending' as const,
  BLOCKED: 'blocked' as const,
} as const;

/** Source dependency mode keys used by planning and website metadata. */
export const SOURCE_DEPENDENCY_MODES = {
  ALL: 'all' as const,
  ALL_SETTLED: 'allSettled' as const,
  ANY: 'any' as const,
  COUNT: 'count' as const,
} as const;

/** Canonical stage names emitted in traces and StageError tagging. */
export const PIPELINE_STAGES = {
  RECOVER: 'recover' as const,
  RESOLVE: 'resolve' as const,
  AUTHENTICATE: 'authenticate' as const,
  PARSE: 'parse' as const,
  VALIDATE: 'validate' as const,
  TRANSFORM: 'transform' as const,
  GATE: 'gate' as const,
  DISPATCH: 'dispatch' as const,
  CAPTURE: 'capture' as const,
  SETTLE: 'settle' as const,
} as const;

/** Tracer event names for stage lifecycle. */
export const TRACER_STAGE_EVENTS = {
  OK: 'stage.ok' as const,
  FAILED: 'stage.failed' as const,
} as const;

/** Tracer event names for file/unit lifecycle. */
export const TRACER_FILE_EVENTS = {
  PROCESSED: 'files.processed' as const,
  RESIZED: 'file.resized' as const,
  UNIT_POSTED: 'unit.posted' as const,
  UNIT_FAILED: 'unit.failed' as const,
} as const;

/** Tracer event names for rate limiting. */
export const TRACER_RATE_EVENTS = {
  WAIT: 'rate.wait' as const,
} as const;

/** Tracer event names for task lifecycle. */
export const TRACER_TASK_EVENTS = {
  STARTED: 'task.started' as const,
  SUCCEEDED: 'task.succeeded' as const,
  FAILED: 'task.failed' as const,
  RETRY: 'task.retry' as const,
  SKIPPED: 'task.skipped' as const,
  CANCELLED: 'task.cancelled' as const,
  PERSIST_FAILED: 'task.persist_failed' as const,
} as const;

/** Tracer event names for job lifecycle. */
export const TRACER_JOB_EVENTS = {
  ENQUEUED: 'job.enqueued' as const,
  RESUME: 'job.resume' as const,
  COMPLETED: 'job.completed' as const,
} as const;

/** Skip reason strings. */
export const SKIP_REASONS = {
  DEPENDENCY_UNREACHABLE: 'dependency unreachable' as const,
} as const;
