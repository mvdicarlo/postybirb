import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Logger } from '@postybirb/logger';
import { PlatformService, PlatformWorkerProcess } from '@postybirb/platform';
import { ImageResizeProps } from '@postybirb/types';
import { toError } from '@postybirb/utils/common';
import type { queueAsPromised } from 'fastq';
import fastq from 'fastq';
import { existsSync } from 'fs';
import { cpus } from 'os';
import { join, resolve } from 'path';

/**
 * Input sent to the sharp worker process.
 */
export interface SharpWorkerInput {
  operation: 'resize' | 'metadata' | 'thumbnail' | 'healthcheck';
  buffer: Buffer;
  resize?: ImageResizeProps;
  mimeType: string;
  fileName?: string;
  fileId?: string;
  fileWidth?: number;
  fileHeight?: number;
  thumbnailBuffer?: Buffer;
  thumbnailMimeType?: string;
  thumbnailPreferredDimension?: number;
  generateThumbnail?: boolean;
}

/**
 * Result returned from the sharp worker process.
 */
export interface SharpWorkerResult {
  buffer?: Buffer;
  mimeType?: string;
  width?: number;
  height?: number;
  format?: string;
  fileName?: string;
  modified: boolean;
  thumbnailBuffer?: Buffer;
  thumbnailMimeType?: string;
  thumbnailWidth?: number;
  thumbnailHeight?: number;
  thumbnailFileName?: string;
}

/**
 * Per-job timeout. Acts as a safety net against a native call that hangs
 * (rather than crashes) the worker — after this, the job is rejected and the
 * worker is terminated. Generous so legitimately large images are not killed.
 */
const REQUEST_TIMEOUT_MS = 180_000;

/**
 * Maximum number of sharp worker processes allowed to run concurrently.
 *
 * Each job forks its own throwaway process, so without a limit a submission
 * with many files could spawn a burst of libvips processes at once, spiking
 * memory and CPU. Jobs beyond this limit queue and start as workers free up.
 * Capped well below the core count because every worker is a full OS process
 * running native image processing — a small ceiling keeps peak resource use
 * predictable on the light desktop workload.
 */
const MAX_CONCURRENT_WORKERS = Math.min(cpus().length, 3);

/**
 * Runs sharp image processing in a throwaway worker process, one per job,
 * obtained through the {@link PlatformService} process abstraction.
 *
 * Each call to {@link SharpInstanceManager.processImage} forks a fresh worker,
 * sends it a single job, awaits the reply, and then terminates the worker.
 * This keeps the manager extremely simple — there is no shared state, request
 * multiplexing, or reuse to reason about — and gives two properties for free:
 *
 *  - **Crash isolation.** In production (Electron) the worker is a real,
 *    separate OS process. If libvips segfaults, aborts, or runs out of memory,
 *    only that worker dies; the job rejects with a normal catchable error so
 *    posting fails gracefully instead of taking the whole app down.
 *  - **Zero memory retention.** Because the worker is torn down after every
 *    job, all libvips native memory is released immediately and the glibc heap
 *    fragmentation that builds up in a long-lived native process never
 *    accumulates. The trade-off is a per-job spawn cost (~100-300ms), which is
 *    negligible for PostyBirb's light desktop workload (1-2 users).
 *
 * Concurrency is bounded by a {@link MAX_CONCURRENT_WORKERS}-wide queue so a
 * batch of images never spawns an unbounded burst of worker processes at once;
 * excess jobs wait and start as earlier workers finish.
 *
 * Under test, the platform supplies an in-process worker (no real process is
 * spawned); the sharp logic is still fully exercised, only the OS-level crash
 * isolation is bypassed.
 *
 * @class SharpInstanceManager
 */
@Injectable()
export class SharpInstanceManager implements OnModuleDestroy {
  private readonly logger = Logger();

  /** Live worker processes, one per in-flight job. Tracked so they can all
   * be terminated on shutdown. */
  private readonly activeChildren = new Set<PlatformWorkerProcess>();

  /**
   * Concurrency limiter: caps how many worker processes run at once. Jobs
   * pushed beyond {@link MAX_CONCURRENT_WORKERS} queue until a slot frees up.
   */
  private readonly queue: queueAsPromised<SharpWorkerInput, SharpWorkerResult> =
    fastq.promise(
      (input: SharpWorkerInput) => this.runJob(input),
      MAX_CONCURRENT_WORKERS,
    );

  /** Set during shutdown so no further jobs are accepted. */
  private destroyed = false;

  /** Resolved absolute path to sharp-worker.js. */
  private readonly workerPath: string;

  constructor(private readonly platform: PlatformService) {
    this.workerPath = this.resolveWorkerPath();

    // Run health check asynchronously — don't block construction, but log
    // warnings if sharp is broken on this system. The .catch() is a safety net
    // to prevent unhandled rejection if something unexpected escapes the
    // try/catch inside runHealthCheck.
    this.runHealthCheck().catch((err) => {
      this.logger
        .withError(err)
        .error('Unexpected error during sharp health check');
    });
  }

  /**
   * Probe the worker with a trivial sharp operation to detect
   * missing native bindings, glibc issues, or sandbox restrictions
   * at startup rather than failing silently during posting.
   */
  private async runHealthCheck(): Promise<void> {
    try {
      const result = await this.processImage({
        operation: 'healthcheck',
        buffer: Buffer.alloc(0),
        mimeType: '',
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { diagnostics } = result as any;
      if (diagnostics) {
        this.logger.withMetadata(diagnostics).info('Sharp health check passed');
      }
    } catch (error) {
      this.logger
        .withError(error)
        .error(
          'Sharp health check FAILED — image processing will not work. ' +
            'This usually means native sharp bindings failed to load. ' +
            'On Linux, ensure glibc >= 2.17 is installed. ' +
            'On Snap/Flatpak, the sandbox may prevent loading native modules.',
        );
    }
  }

  async onModuleDestroy() {
    this.destroyed = true;

    const active = this.activeChildren.size;
    if (active > 0) {
      this.logger
        .withMetadata({ activeWorkers: active })
        .warn(
          `Sharp instance manager shutting down with ${active} worker(s) still running — terminating them`,
        );
    }

    // Terminate any still-running workers. Each kill triggers the worker's
    // onExit handler, which rejects its in-flight job with a catchable error.
    for (const child of this.activeChildren) {
      try {
        child.kill();
      } catch (err) {
        // kill() may throw if the process is already gone — safe to ignore.
        this.logger
          .withError(err)
          .warn(
            'Failed to terminate sharp worker process during shutdown (may already be gone)',
          );
      }
    }
    this.activeChildren.clear();

    if (active === 0) {
      this.logger.info(
        'Sharp instance manager destroyed (no workers were running)',
      );
    }
  }

  /**
   * Fork a fresh sharp worker process via the platform abstraction.
   *
   * The platform decides how the worker is hosted: a real Electron
   * utilityProcess in production (true crash isolation) or an in-process
   * stand-in under test.
   */
  private async spawnWorker(operation: string): Promise<PlatformWorkerProcess> {
    const child = await this.platform.process.fork(this.workerPath, {
      serviceName: 'PostyBirb Sharp Image Processor',
    });

    this.logger
      .withMetadata({
        pid: child.pid,
        operation,
        isolatesCrashes: this.platform.process.isolatesCrashes,
      })
      .info('Spawned sharp worker process');

    return child;
  }

  /**
   * Cached resolved path — avoids repeated filesystem probing.
   */
  private static resolvedWorkerPath: string | null = null;

  /**
   * Resolve the path to the sharp-worker.js file.
   * Works in:
   * - Production build (webpack output): __dirname/assets/sharp-worker.js
   * - Development (nx serve): relative to source tree
   * - Test mode: also relative to source tree (for require())
   */
  private resolveWorkerPath(): string {
    if (SharpInstanceManager.resolvedWorkerPath) {
      return SharpInstanceManager.resolvedWorkerPath;
    }

    const candidates = [
      // Production build: assets sit next to the bundled main.js
      join(__dirname, 'assets', 'sharp-worker.js'),
      // Source tree: __dirname = apps/client-server/src/app/image-processing
      resolve(__dirname, '..', '..', '..', 'assets', 'sharp-worker.js'),
      // cwd-based (nx serve, standalone)
      join(
        process.cwd(),
        'apps',
        'client-server',
        'src',
        'assets',
        'sharp-worker.js',
      ),
      // cwd-based (jest may cd into apps/client-server)
      join(process.cwd(), 'src', 'assets', 'sharp-worker.js'),
    ];

    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        SharpInstanceManager.resolvedWorkerPath = candidate;
        this.logger
          .withMetadata({ resolvedPath: candidate })
          .info('Resolved sharp worker path');
        return candidate;
      }
    }

    this.logger
      .withMetadata({ checked: candidates })
      .warn(
        'Sharp worker not found in any candidate path; falling back to first candidate. ' +
          'Image processing will likely fail.',
      );
    return candidates[0];
  }

  /**
   * Process an image, bounded by the concurrency queue.
   *
   * Public entry point: enqueues the job so that no more than
   * {@link MAX_CONCURRENT_WORKERS} worker processes run at once. The actual
   * spawn/await/kill happens in {@link SharpInstanceManager.runJob}.
   */
  async processImage(input: SharpWorkerInput): Promise<SharpWorkerResult> {
    if (this.destroyed) {
      throw new Error('Sharp instance manager has been destroyed');
    }
    return this.queue.push(input);
  }

  /**
   * Run a single image-processing job in a throwaway worker process.
   *
   * Forks a fresh worker, sends it the job, awaits the reply, then always
   * terminates the worker — whether the job succeeded, failed, timed out, or
   * the worker crashed. One process per job means there is no shared state to
   * corrupt and all native memory is released as soon as the job completes.
   *
   * Buffers are copied to the worker via structured clone — the caller's
   * original buffers are NOT detached and remain usable after the call. This
   * means peak memory for a single operation is roughly 2× the input size
   * (original + worker copy).
   *
   * If the worker crashes (native libvips fault / OOM) the returned promise
   * rejects with a normal Error rather than crashing the main process.
   */
  private async runJob(input: SharpWorkerInput): Promise<SharpWorkerResult> {
    if (this.destroyed) {
      throw new Error('Sharp instance manager has been destroyed');
    }

    const child = await this.spawnWorker(input.operation);
    this.activeChildren.add(child);

    return new Promise<SharpWorkerResult>((resolvePromise, rejectPromise) => {
      let settled = false;

      // Settle the job exactly once and tear the worker down. Any later
      // event (e.g. the onExit triggered by our own kill()) is ignored.
      const finish = (settleFn: () => void) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        this.activeChildren.delete(child);
        try {
          child.kill();
        } catch {
          // Already gone (e.g. it crashed) — safe to ignore.
        }
        settleFn();
      };

      const timer = setTimeout(() => {
        finish(() => {
          this.logger
            .withMetadata({
              operation: input.operation,
              timeoutMs: REQUEST_TIMEOUT_MS,
              pid: child.pid,
            })
            .error('Sharp operation timed out; terminating the worker process');
          rejectPromise(
            new Error(
              `Sharp ${input.operation} operation timed out after ${REQUEST_TIMEOUT_MS}ms`,
            ),
          );
        });
      }, REQUEST_TIMEOUT_MS);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      child.onMessage((message: any) => {
        finish(() => {
          if (message?.error) {
            this.logger
              .withMetadata({
                operation: input.operation,
                workerError: message.error.message,
              })
              .warn('Sharp worker returned an error for operation');
            rejectPromise(
              new Error(message.error.message || 'Sharp worker error'),
            );
            return;
          }

          const result = message?.result as SharpWorkerResult;

          // Structured clone converts Node.js Buffers into plain Uint8Arrays.
          // Re-wrap them so downstream consumers (e.g. form-data) that rely on
          // Buffer methods/stream semantics work.
          if (result?.buffer && !Buffer.isBuffer(result.buffer)) {
            result.buffer = Buffer.from(result.buffer);
          }
          if (
            result?.thumbnailBuffer &&
            !Buffer.isBuffer(result.thumbnailBuffer)
          ) {
            result.thumbnailBuffer = Buffer.from(result.thumbnailBuffer);
          }

          resolvePromise(result);
        });
      });

      child.onExit((code: number) => {
        // If we've already settled, this is the onExit from our own kill() —
        // ignored by finish(). Otherwise the worker died before replying: a
        // native libvips crash or OOM. Reject with a catchable error.
        finish(() => {
          this.logger
            .withMetadata({
              operation: input.operation,
              exitCode: code,
              pid: child.pid,
            })
            .error(
              'Sharp worker process exited before returning a result ' +
                '(likely a native libvips crash or out-of-memory)',
            );
          rejectPromise(
            new Error(
              `Sharp worker process exited unexpectedly (code ${code}) during ` +
                `${input.operation}. This usually indicates a native libvips ` +
                'crash or out-of-memory while processing an image.',
            ),
          );
        });
      });

      try {
        child.postMessage({ id: 1, input });
      } catch (error) {
        finish(() => {
          this.logger
            .withError(error)
            .error('Failed to dispatch image to sharp worker process');
          rejectPromise(toError(error));
        });
      }
    });
  }

  /**
   * Get metadata for an image buffer.
   * @param buffer - The image buffer
   * @returns width, height, format, mimeType
   */
  async getMetadata(buffer: Buffer): Promise<{
    width: number;
    height: number;
    format: string;
    mimeType: string;
  }> {
    const result = await this.processImage({
      operation: 'metadata',
      buffer,
      mimeType: '',
    });

    return {
      width: result.width ?? 0,
      height: result.height ?? 0,
      format: result.format ?? 'unknown',
      mimeType: result.mimeType ?? 'image/unknown',
    };
  }

  /**
   * Generate a thumbnail from an image buffer.
   * Used by CreateFileService and UpdateFileService during file upload.
   */
  async generateThumbnail(
    buffer: Buffer,
    mimeType: string,
    fileName: string,
    preferredDimension = 400,
  ): Promise<{
    buffer: Buffer;
    width: number;
    height: number;
    mimeType: string;
    fileName: string;
  }> {
    const result = await this.processImage({
      operation: 'thumbnail',
      buffer,
      mimeType,
      fileName,
      thumbnailPreferredDimension: preferredDimension,
    });

    return {
      buffer: result.buffer ?? buffer,
      width: result.width ?? 0,
      height: result.height ?? 0,
      mimeType: result.mimeType ?? mimeType,
      fileName: result.fileName ?? fileName,
    };
  }

  /**
   * Resize an image for posting. Handles format conversion, dimensional
   * resize, maxBytes scaling, and optional thumbnail generation.
   */
  async resizeForPost(input: {
    buffer: Buffer;
    resize?: ImageResizeProps;
    mimeType: string;
    fileName: string;
    fileId: string;
    fileWidth: number;
    fileHeight: number;
    thumbnailBuffer?: Buffer;
    thumbnailMimeType?: string;
    generateThumbnail: boolean;
    thumbnailPreferredDimension?: number;
  }): Promise<SharpWorkerResult> {
    return this.processImage({
      operation: 'resize',
      buffer: input.buffer,
      resize: input.resize,
      mimeType: input.mimeType,
      fileName: input.fileName,
      fileId: input.fileId,
      fileWidth: input.fileWidth,
      fileHeight: input.fileHeight,
      thumbnailBuffer: input.thumbnailBuffer,
      thumbnailMimeType: input.thumbnailMimeType,
      generateThumbnail: input.generateThumbnail,
      thumbnailPreferredDimension: input.thumbnailPreferredDimension ?? 500,
    });
  }

  /**
   * Get worker statistics for monitoring.
   */
  getStats() {
    return {
      activeWorkers: this.activeChildren.size,
      queuedJobs: this.queue.length(),
      maxConcurrentWorkers: MAX_CONCURRENT_WORKERS,
    };
  }
}
