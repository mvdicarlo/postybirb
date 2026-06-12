/**
 * Relay engine — typed errors + retry policy.
 *
 * Every pipeline stage that fails throws a StageError tagged with a
 * {@link PostErrorKind}. The kind determines whether the task is retried,
 * waits, or fails terminally.
 */

import { ITaskError, PostErrorKind } from '@postybirb/types';

export class StageError extends Error {
  kind: PostErrorKind;
  stage: string;
  /** for RATE_LIMITED: explicit wait hint in ms */
  retryAfterMs?: number;
  additionalInfo?: unknown;

  constructor(init: {
    kind: PostErrorKind;
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

/** Heuristic: does a raw error look like a retryable network/IO blip? */
const TRANSIENT_ERROR_CODES: ReadonlySet<string> = new Set([
  'ECONNRESET',
  'ECONNREFUSED',
  'ECONNABORTED',
  'ETIMEDOUT',
  'ENOTFOUND',
  'EAI_AGAIN',
  'EPIPE',
  'ENETUNREACH',
  'EHOSTUNREACH',
]);

const TRANSIENT_MESSAGE_RE =
  /socket hang up|network|timeout|timed out|fetch failed|ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|temporar/i;

function looksTransient(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const { code, message } = err as { code?: unknown; message?: unknown };
  if (typeof code === 'string' && TRANSIENT_ERROR_CODES.has(code)) return true;
  if (typeof message === 'string' && TRANSIENT_MESSAGE_RE.test(message)) {
    return true;
  }
  return false;
}

/**
 * Coerce any thrown value into a StageError tagged with a stage. Network/IO
 * blips (in any stage — login, parse, file processing, dispatch) are tagged
 * TRANSIENT so they retry rather than failing the task permanently; everything
 * else defaults to FATAL.
 */
export function classify(stage: string, err: unknown): StageError {
  if (err instanceof StageError) return err;
  const kind = looksTransient(err) ? PostErrorKind.TRANSIENT : PostErrorKind.FATAL;
  if (err instanceof Error) {
    return new StageError({
      kind,
      stage,
      message: err.message,
      cause: err,
    });
  }
  return new StageError({
    kind,
    stage,
    message: String(err),
  });
}

const RETRYABLE: ReadonlySet<PostErrorKind> = new Set([
  PostErrorKind.RATE_LIMITED,
  PostErrorKind.TRANSIENT,
]);

export function isRetryable(kind: PostErrorKind): boolean {
  return RETRYABLE.has(kind);
}

export type RetryDecision =
  | { action: 'fail' }
  | { action: 'retry'; delayMs: number; consumesAttempt: boolean };

/**
 * Decide what to do after a task fails.
 *  - RATE_LIMITED: wait (does not consume an attempt).
 *  - TRANSIENT: exponential backoff with jitter, consumes an attempt.
 *  - everything else: terminal failure.
 */
export function decideRetry(
  err: StageError,
  attemptsUsed: number,
  maxAttempts: number,
): RetryDecision {
  if (err.kind === PostErrorKind.RATE_LIMITED) {
    return {
      action: 'retry',
      delayMs: err.retryAfterMs ?? 1000,
      consumesAttempt: false,
    };
  }
  if (!isRetryable(err.kind)) return { action: 'fail' };
  if (attemptsUsed >= maxAttempts) return { action: 'fail' };

  const base = 200 * 2 ** attemptsUsed; // 200, 400, 800, ...
  const jitter = Math.floor(Math.random() * 100);
  return { action: 'retry', delayMs: base + jitter, consumesAttempt: true };
}

export function toTaskError(err: StageError): ITaskError {
  return {
    kind: err.kind,
    stage: err.stage,
    message: err.message,
    retryable: isRetryable(err.kind),
    stack: err.stack,
  };
}
