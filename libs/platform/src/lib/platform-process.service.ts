/**
 * A handle to an isolated worker process spawned via
 * {@link PlatformProcessService.fork}.
 *
 * The worker communicates over structured-clone messages. Implementations may
 * back this with a real OS process (e.g. Electron's `utilityProcess`) or, in
 * tests, an in-process stand-in that runs the worker module directly.
 *
 * Request/response correlation (matching a reply to its request) is the
 * caller's responsibility — this interface is a transparent message channel.
 */
export interface PlatformWorkerProcess {
  /**
   * OS process id of the worker, or `undefined` for in-process (test)
   * implementations that do not spawn a real process.
   */
  readonly pid: number | undefined;

  /** Send a structured-cloneable message to the worker. */
  postMessage(message: unknown): void;

  /** Register a listener invoked for every message emitted by the worker. */
  onMessage(listener: (message: unknown) => void): void;

  /**
   * Register a listener invoked once when the worker terminates. `code`
   * mirrors the OS exit code (`0` for a clean exit, non-zero for a crash).
   */
  onExit(listener: (code: number) => void): void;

  /** Terminate the worker. Safe to call if the worker has already exited. */
  kill(): void;
}

/**
 * Options controlling how a worker process is forked.
 */
export interface PlatformForkOptions {
  /**
   * Human-readable name surfaced in OS process listings and diagnostics
   * (e.g. Electron's `serviceName`). Optional.
   */
  serviceName?: string;
}

/**
 * Spawns isolated worker processes that run a Node module in their own OS
 * process. The primary purpose is crash isolation for native code: a worker
 * that segfaults, aborts, or runs out of memory terminates only itself,
 * leaving the host process alive to observe the exit and recover.
 *
 * Use this abstract class as both the type and the NestJS DI token, accessed
 * through the {@link PlatformService} facade as `platform.process`.
 *
 * Forked modules are expected to support the worker message protocol:
 *  - In a real spawned process the module wires itself to `process.parentPort`.
 *  - For in-process (test) execution the module must export a
 *    `dispatch(message) => Promise<response>` function so the platform can
 *    relay a request and its reply without spawning a process.
 */
export abstract class PlatformProcessService {
  /**
   * Whether `fork` spawns a real, separate OS process. `true` for production
   * implementations (crash isolation guaranteed); `false` for in-process test
   * implementations where a native crash would still take down the host.
   * Callers can use this to relax crash-isolation expectations in tests.
   */
  abstract readonly isolatesCrashes: boolean;

  /**
   * Fork `modulePath` as a worker process.
   *
   * @param modulePath Absolute path to the worker module.
   * @param options Optional fork options.
   * @returns A promise that resolves with the worker handle once the worker is
   *   ready to receive messages, and rejects if it fails to start.
   */
  abstract fork(
    modulePath: string,
    options?: PlatformForkOptions,
  ): Promise<PlatformWorkerProcess>;
}
