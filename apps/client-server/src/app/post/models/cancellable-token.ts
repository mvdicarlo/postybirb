import { CancellationError } from './cancellation-error';

/**
 * CancellableToken is a simple class that can be used to cancel a task.
 *
 * In addition to the synchronous {@link isCancelled} flag, callers can
 * subscribe with {@link onCancel} to be woken the moment cancellation happens
 * (e.g. to abort an in-progress backoff/rate-limit sleep instead of waiting it
 * out). Listeners fire at most once.
 * @class CancellableToken
 */
export class CancellableToken {
  private cancelled = false;

  private readonly listeners = new Set<() => void>();

  public get isCancelled(): boolean {
    return this.cancelled;
  }

  public cancel(): void {
    if (this.cancelled) return;
    this.cancelled = true;
    for (const listener of this.listeners) {
      try {
        listener();
      } catch {
        // a misbehaving listener must not prevent the others from running
      }
    }
    this.listeners.clear();
  }

  /**
   * Register a callback invoked once when the token is cancelled. If the token
   * is already cancelled the callback runs synchronously. Returns an
   * unsubscribe function so callers can detach the listener (e.g. when a sleep
   * completes normally) and avoid leaking references.
   */
  public onCancel(listener: () => void): () => void {
    if (this.cancelled) {
      listener();
      return () => undefined;
    }
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public throwIfCancelled(): void {
    if (this.cancelled) {
      throw new CancellationError();
    }
  }
}
