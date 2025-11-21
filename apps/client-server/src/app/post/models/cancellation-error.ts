/**
 * CancellationError is thrown when a task is cancelled.
 * @class CancellationError
 */
export class CancellationError extends Error {
  constructor(message = 'Task was cancelled.') {
    super(message);
    this.name = 'CancellationError';

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CancellationError);
    }
  }
}
