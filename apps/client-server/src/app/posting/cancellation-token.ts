export class CancellationToken {
  private readonly controller = new AbortController();

  public get signal(): AbortSignal {
    return this.controller.signal;
  }

  public get aborted(): boolean {
    return this.signal.aborted;
  }

  public abort(reason?: unknown): void {
    const abortReason: Error =
      reason instanceof Error ? reason : new Error(String(reason));
    this.controller.abort(abortReason);
  }

  public throwIfAborted(): void {
    this.signal.throwIfAborted();
  }
}
