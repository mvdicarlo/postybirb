/**
 * Relay posting framework — typed errors + retry policy.
 *
 * Every pipeline stage that fails throws a StageError tagged with a `kind`.
 * The kind determines whether the task is retried, waits, or fails terminally.
 */

import type { TaskError } from './model.ts';

export const ErrorKind = {
  /** Hit a website rate limit. Wait then retry (does not consume an attempt). */
  RATE_LIMITED: 'RATE_LIMITED',
  /** Auth/session expired. Not retryable automatically; surface re-login. */
  AUTH_EXPIRED: 'AUTH_EXPIRED',
  /** Submission/option failed validation. Not retryable. */
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  /** A file could not be made to satisfy a website constraint. Not retryable. */
  TRANSFORM_FAILED: 'TRANSFORM_FAILED',
  /** Network/5xx/transient. Retry with exponential backoff. */
  TRANSIENT: 'TRANSIENT',
  /** Unexpected/unknown fatal error. Not retryable. */
  FATAL: 'FATAL',
} as const;
export type ErrorKind = (typeof ErrorKind)[keyof typeof ErrorKind];

export class StageError extends Error {
  kind: ErrorKind;
  stage: string;
  /** for RATE_LIMITED: explicit wait hint in ms */
  retryAfterMs?: number;
  additionalInfo?: unknown;

  constructor(init: {
    kind: ErrorKind;
    stage: string;
    message: string;
    retryAfterMs?: number;
    additionalInfo?: unknown;
    cause?: unknown;
  }) {
    super(init.message);
    this.name = 'StageError';
    this.kind = init.kind;
    this.stage = init.stage;
    this.retryAfterMs = init.retryAfterMs;
    this.additionalInfo = init.additionalInfo;
    if (init.cause instanceof Error && init.cause.stack) {
      this.stack = init.cause.stack;
    }
  }
}

/** Coerce any thrown value into a StageError tagged with a stage. */
export function classify(stage: string, err: unknown): StageError {
  if (err instanceof StageError) return err;
  if (err instanceof Error) {
    return new StageError({
      kind: ErrorKind.FATAL,
      stage,
      message: err.message,
      cause: err,
    });
  }
  return new StageError({ kind: ErrorKind.FATAL, stage, message: String(err) });
}

const RETRYABLE: ReadonlySet<ErrorKind> = new Set([
  ErrorKind.RATE_LIMITED,
  ErrorKind.TRANSIENT,
]);

export function isRetryable(kind: ErrorKind): boolean {
  return RETRYABLE.has(kind);
}

export type RetryDecision =
  | { action: 'fail' }
  | { action: 'retry'; delayMs: number; consumesAttempt: boolean };

/**
 * Decide what to do after a task fails.
 * - RATE_LIMITED: wait (does not consume an attempt, so we don't exhaust
 *   retries just by being throttled).
 * - TRANSIENT: exponential backoff with jitter, consumes an attempt.
 * - everything else: terminal failure.
 */
export function decideRetry(
  err: StageError,
  attemptsUsed: number,
  maxAttempts: number,
): RetryDecision {
  if (err.kind === ErrorKind.RATE_LIMITED) {
    return {
      action: 'retry',
      delayMs: err.retryAfterMs ?? 1000,
      consumesAttempt: false,
    };
  }
  if (!isRetryable(err.kind)) return { action: 'fail' };
  if (attemptsUsed >= maxAttempts) return { action: 'fail' };

  const base = 200 * Math.pow(2, attemptsUsed); // 200, 400, 800, ...
  const jitter = Math.floor(Math.random() * 100);
  return { action: 'retry', delayMs: base + jitter, consumesAttempt: true };
}

export function toTaskError(err: StageError): TaskError {
  return {
    kind: err.kind,
    stage: err.stage,
    message: err.message,
    retryable: isRetryable(err.kind),
    stack: err.stack,
  };
}
