/**
 * CancellableToken is a simple class that can be used to cancel a task.
 * @class CancellableToken
 */
export class CancellableToken {
  private cancelled = false;

  public get isCancelled(): boolean {
    return this.cancelled;
  }

  public cancel(): void {
    this.cancelled = true;
  }

  public throwIfCancelled(): void {
    if (this.cancelled) {
      throw new Error('Task was cancelled.');
    }
  }
}
