/* eslint-disable max-classes-per-file */
import { Injectable } from '@nestjs/common';
import {
    PlatformForkOptions,
    PlatformProcessService,
    PlatformWorkerProcess,
} from '@postybirb/platform';
import { app, UtilityProcess, utilityProcess } from 'electron';

/**
 * Wraps an Electron {@link UtilityProcess} in the platform-agnostic
 * {@link PlatformWorkerProcess} contract so callers never touch Electron APIs.
 */
class ElectronWorkerProcess implements PlatformWorkerProcess {
  constructor(private readonly child: UtilityProcess) {}

  get pid(): number | undefined {
    return this.child.pid;
  }

  postMessage(message: unknown): void {
    this.child.postMessage(message);
  }

  onMessage(listener: (message: unknown) => void): void {
    this.child.on('message', listener);
  }

  onExit(listener: (code: number) => void): void {
    this.child.on('exit', listener);
  }

  kill(): void {
    this.child.kill();
  }
}

/**
 * Electron-backed implementation of {@link PlatformProcessService}.
 *
 * Forks worker modules into a real Electron `utilityProcess` (a separate OS
 * process with Node integration). This provides true crash isolation: a
 * native fault, abort, or out-of-memory in the worker terminates only the
 * child process, leaving the main process alive to recover.
 *
 * This is the single place in the app that imports Electron's
 * `utilityProcess`; consumers depend on {@link PlatformProcessService}.
 */
@Injectable()
export class ElectronProcessService extends PlatformProcessService {
  readonly isolatesCrashes = true;

  async fork(
    modulePath: string,
    options?: PlatformForkOptions,
  ): Promise<PlatformWorkerProcess> {
    // utilityProcess.fork can only be called after the app is ready.
    await app.whenReady();

    const child = utilityProcess.fork(modulePath, [], {
      serviceName: options?.serviceName,
      // Pipe child stdout/stderr to the main process logs for diagnostics.
      stdio: 'inherit',
    });

    // Resolve once the child has actually spawned; reject if it dies first.
    await new Promise<void>((resolve, reject) => {
      const onSpawn = () => {
        cleanup();
        resolve();
      };
      const onEarlyExit = (code: number) => {
        cleanup();
        reject(
          new Error(
            `Worker process '${
              options?.serviceName ?? modulePath
            }' exited before it finished spawning (code ${code})`,
          ),
        );
      };
      const cleanup = () => {
        child.off('spawn', onSpawn);
        child.off('exit', onEarlyExit);
      };
      child.once('spawn', onSpawn);
      child.once('exit', onEarlyExit);
    });

    return new ElectronWorkerProcess(child);
  }
}
