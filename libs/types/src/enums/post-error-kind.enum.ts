/**
 * Classification of a posting failure. Determines the retry policy applied
 * by the scheduler.
 * @enum {string}
 */
export enum PostErrorKind {
  /** Hit a website rate limit. Wait then retry (does not consume an attempt). */
  RATE_LIMITED = 'RATE_LIMITED',
  /** Auth/session expired. Not retried automatically; surface re-login. */
  AUTH_EXPIRED = 'AUTH_EXPIRED',
  /** Submission/options failed validation. Not retryable. */
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  /** A file could not be made to satisfy a website constraint. Not retryable. */
  TRANSFORM_FAILED = 'TRANSFORM_FAILED',
  /** Network/5xx/transient. Retry with exponential backoff. */
  TRANSIENT = 'TRANSIENT',
  /** Unexpected/unknown fatal error. Not retryable. */
  FATAL = 'FATAL',
}
