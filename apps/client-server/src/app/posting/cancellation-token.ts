export class CancellationToken {
  private readonly controller = new AbortController();

  public get signal(): AbortSignal {
    return this.controller.signal;
  }

  public get aborted(): boolean {
    return this.signal.aborted;
  }

  public abort(reason?: unknown): void {
    this.controller.abort(reason);
  }

  public throwIfAborted(): void {
    this.signal.throwIfAborted();
  }
}
