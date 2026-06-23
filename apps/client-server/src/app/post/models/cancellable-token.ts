import { CancellationError } from './cancellation-error';

/**
 * CancellableToken signals cooperative cancellation of a posting task.
 *
 * Backed by a standard {@link AbortController} so its {@link signal} can be
 * handed directly to AbortSignal-aware APIs (fetch/axios, node:timers/promises,
 * a website's HTTP client, etc.) for end-to-end cancellation. The synchronous
 * {@link isCancelled} flag and {@link onCancel} subscription are retained for
 * existing call sites (e.g. aborting an in-progress rate-limit/backoff sleep).
 * Listeners fire at most once.
 * @class CancellableToken
 */
export class CancellableToken {
  private readonly controller = new AbortController();

  /** Standard abort signal for AbortSignal-aware APIs. */
  public get signal(): AbortSignal {
    return this.controller.signal;
  }

  public get isCancelled(): boolean {
    return this.controller.signal.aborted;
  }

  public cancel(): void {
    if (this.controller.signal.aborted) return;
    this.controller.abort();
  }

  /**
   * Register a callback invoked once when the token is cancelled. If the token
   * is already cancelled the callback runs synchronously. Returns an
   * unsubscribe function so callers can detach the listener (e.g. when a sleep
   * completes normally) and avoid leaking references.
   */
  public onCancel(listener: () => void): () => void {
    if (this.isCancelled) {
      listener();
      return () => undefined;
    }
    // Isolate a misbehaving listener so it cannot disrupt other abort handlers.
    const handler = () => {
      try {
        listener();
      } catch {
        // a misbehaving listener must not prevent the others from running
      }
    };
    this.controller.signal.addEventListener('abort', handler, { once: true });
    return () =>
      this.controller.signal.removeEventListener('abort', handler);
  }

  public throwIfCancelled(): void {
    if (this.isCancelled) {
      throw new CancellationError();
    }
  }
}
