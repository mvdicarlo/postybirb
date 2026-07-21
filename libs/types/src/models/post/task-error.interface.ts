import { PostErrorKind } from '../../enums';

/**
 * Structured error captured on a failed PostTask or PostUnit.
 * Persisted as JSON so it survives restarts and powers the debug view.
 * @interface ITaskError
 */
export interface ITaskError {
  /** The classification that drove the retry decision. */
  kind: PostErrorKind;

  /** The pipeline stage at which the error occurred (e.g. 'dispatch'). */
  stage: string;

  /** Human-readable error message. */
  message: string;

  /** Whether the error kind is retryable (informational; policy lives in the engine). */
  retryable: boolean;

  /** Optional stack trace. */
  stack?: string;

  /** Any additional debug context. */
  additionalInfo?: unknown;
}
