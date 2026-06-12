import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Logger } from '@postybirb/logger';
import { PlatformService, PlatformWorkerProcess } from '@postybirb/platform';
import { ImageResizeProps } from '@postybirb/types';
import { toError } from '@postybirb/utils/common';
import { existsSync } from 'fs';
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
 * Per-request timeout. Acts as a safety net against a native call that
 * hangs (rather than crashes) the child — after this, the request is
 * rejected and the child is restarted so the next request gets a fresh,
 * healthy process. Generous so legitimately large images are not killed.
 */
const REQUEST_TIMEOUT_MS = 120_000;

type PendingRequest = {
  resolve: (value: SharpWorkerResult) => void;
  reject: (reason: Error) => void;
  timer: ReturnType<typeof setTimeout>;
  operation: string;
};

/**
 * Manages a dedicated worker process that runs sharp image processing,
 * obtained through the {@link PlatformService} process abstraction.
 *
 * In production (Electron) the worker is a real, separate OS process, which
 * isolates sharp/libvips native code from the main process: if libvips
 * segfaults, aborts, or runs out of memory (e.g. on a pathological image or
 * after long idle), only the child process dies. The main process survives,
 * a fresh child is spawned on the next request, and any in-flight requests
 * are rejected with a normal catchable error so posting fails gracefully
 * instead of taking the whole app down.
 *
 * Under test, the platform supplies an in-process worker (no real process is
 * spawned); the sharp logic is still fully exercised, only the OS-level
 * crash isolation is bypassed.
 *
 * NOTE: This deliberately replaces the previous piscina worker-thread
 * pool. Worker threads share the host process's address space, so a
 * native crash there killed the entire application with no catchable
 * JavaScript error — which is the root cause of the "crash while posting"
 * reports. A separate process is the only way to truly contain native
 * crashes.
 *
 * @class SharpInstanceManager
 */
@Injectable()
export class SharpInstanceManager implements OnModuleDestroy {
  private readonly logger = Logger();

  /** The current sharp worker process, or null if not yet spawned/crashed. */
  private child: PlatformWorkerProcess | null = null;

  /** In-flight spawn, so concurrent callers share a single child. */
  private childReady: Promise<PlatformWorkerProcess> | null = null;

  /** Outstanding requests keyed by id, awaiting a response from the child. */
  private readonly pending = new Map<number, PendingRequest>();

  /** Monotonic request id used to correlate responses from the child. */
  private requestId = 0;

  /** Set during shutdown so a deliberate kill is not treated as a crash. */
  private destroyed = false;

  /** Resolved absolute path to sharp-worker.js. */
  private readonly workerPath: string;

  constructor(private readonly platform: PlatformService) {
    this.workerPath = this.resolveWorkerPath();

    // Run health check asynchronously — don't block construction, but log
    // warnings if sharp is broken on this system. In production this also
    // eagerly spawns (and validates) the child so the first post is fast.
    // The .catch() is a safety net to prevent unhandled rejection if
    // something unexpected escapes the try/catch inside runHealthCheck.
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
    const { child } = this;
    this.child = null;
    this.childReady = null;

    // Reject anything still in flight so awaiting callers settle.
    const shutdownError = new Error(
      'Sharp instance manager is shutting down',
    );
    for (const [id, request] of this.pending) {
      clearTimeout(request.timer);
      request.reject(shutdownError);
      this.pending.delete(id);
    }

    if (child) {
      this.logger.info('Destroying sharp utility process');
      try {
        child.kill();
      } catch {
        // kill() may throw if the process is already gone — safe to ignore
      }
    }
  }

  /**
   * Ensure a live child process exists, spawning one if necessary.
   * Concurrent callers share a single in-flight spawn.
   */
  private ensureChild(): Promise<PlatformWorkerProcess> {
    if (this.destroyed) {
      return Promise.reject(
        new Error('Sharp instance manager has been destroyed'),
      );
    }
    if (this.child) {
      return Promise.resolve(this.child);
    }
    if (!this.childReady) {
      this.childReady = this.spawnChild().catch((err) => {
        // Allow a future request to retry the spawn.
        this.childReady = null;
        throw err;
      });
    }
    return this.childReady;
  }

  /**
   * Fork the sharp worker process via the platform abstraction and wait
   * until it is ready, then wire up message/exit handlers.
   *
   * The platform decides how the worker is hosted: a real Electron
   * utilityProcess in production (true crash isolation) or an in-process
   * stand-in under test.
   */
  private async spawnChild(): Promise<PlatformWorkerProcess> {
    this.logger
      .withMetadata({
        workerPath: this.workerPath,
        isolatesCrashes: this.platform.process.isolatesCrashes,
      })
      .info('Spawning sharp worker process');

    const child = await this.platform.process.fork(this.workerPath, {
      serviceName: 'PostyBirb Sharp Image Processor',
    });

    child.onMessage((message) => this.handleChildMessage(message));
    child.onExit((code) => this.handleChildExit(code));

    this.child = child;
    return child;
  }

  /**
   * Handle a response message from the child, resolving/rejecting the
   * matching pending request.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handleChildMessage(message: any): void {
    if (!message || typeof message.id !== 'number') {
      return;
    }
    const request = this.pending.get(message.id);
    if (!request) {
      return;
    }
    this.pending.delete(message.id);
    clearTimeout(request.timer);

    if (message.error) {
      request.reject(
        new Error(message.error.message || 'Sharp worker error'),
      );
      return;
    }

    const result = message.result as SharpWorkerResult;

    // Structured clone converts Node.js Buffers into plain Uint8Arrays.
    // Re-wrap them so downstream consumers (e.g. form-data) that rely on
    // Buffer methods/stream semantics work.
    if (result?.buffer && !Buffer.isBuffer(result.buffer)) {
      result.buffer = Buffer.from(result.buffer);
    }
    if (result?.thumbnailBuffer && !Buffer.isBuffer(result.thumbnailBuffer)) {
      result.thumbnailBuffer = Buffer.from(result.thumbnailBuffer);
    }

    request.resolve(result);
  }

  /**
   * Handle the child process exiting. This is the crash-isolation path:
   * instead of the whole app dying, we observe the exit, reject every
   * in-flight request with a catchable error, and let the next request
   * spawn a fresh child.
   */
  private handleChildExit(code: number): void {
    const hadChild = this.child !== null;
    this.child = null;
    this.childReady = null;

    if (this.destroyed) {
      return; // Deliberate shutdown — already handled in onModuleDestroy.
    }

    if (hadChild) {
      const level = code === 0 ? 'warn' : 'error';
      this.logger
        .withMetadata({ exitCode: code, pendingRequests: this.pending.size })
        [level](
          code === 0
            ? 'Sharp utility process exited; it will be respawned on the next request'
            : 'Sharp utility process crashed (likely a native libvips crash or out-of-memory). ' +
                'The main process survived; it will be respawned on the next request.',
        );
    }

    const crashError = new Error(
      `Sharp utility process exited unexpectedly (code ${code}). ` +
        'This usually indicates a native libvips crash or out-of-memory ' +
        'while processing an image.',
    );
    for (const [id, request] of this.pending) {
      clearTimeout(request.timer);
      request.reject(crashError);
      this.pending.delete(id);
    }
  }

  /**
   * Forcefully restart the child (used when a request times out, which
   * may indicate a hung native call).
   */
  private restartChild(): void {
    const { child } = this;
    this.child = null;
    this.childReady = null;
    if (child) {
      try {
        child.kill();
      } catch {
        // Already gone — safe to ignore.
      }
    }
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
        return candidate;
      }
    }

    this.logger.warn(
      `Sharp worker not found in any candidate path. Checked: ${candidates.join(', ')}`,
    );
    return candidates[0];
  }

  /**
   * Process an image using the sharp utility process.
   *
   * Buffers are copied to the child via structured clone — the caller's
   * original buffers are NOT detached and remain usable after the call.
   * This means peak memory for a single operation is roughly
   * 2× the input size (original + child copy).
   *
   * If the child crashes (native libvips fault / OOM) the returned promise
   * rejects with a normal Error rather than crashing the main process.
   */
  async processImage(input: SharpWorkerInput): Promise<SharpWorkerResult> {
    const child = await this.ensureChild();
    this.requestId += 1;
    const id = this.requestId;

    return new Promise<SharpWorkerResult>((resolvePromise, rejectPromise) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        this.logger
          .withMetadata({
            operation: input.operation,
            timeoutMs: REQUEST_TIMEOUT_MS,
          })
          .error('Sharp operation timed out; restarting the utility process');
        rejectPromise(
          new Error(
            `Sharp ${input.operation} operation timed out after ${REQUEST_TIMEOUT_MS}ms`,
          ),
        );
        // The child may be wedged on a hung native call — restart it so the
        // next request gets a healthy process.
        this.restartChild();
      }, REQUEST_TIMEOUT_MS);

      this.pending.set(id, {
        resolve: resolvePromise,
        reject: rejectPromise,
        timer,
        operation: input.operation,
      });

      try {
        child.postMessage({ id, input });
      } catch (error) {
        clearTimeout(timer);
        this.pending.delete(id);
        this.logger
          .withError(error)
          .error('Failed to dispatch image to sharp utility process');
        rejectPromise(toError(error));
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
   * Get utility-process statistics for monitoring.
   */
  getStats() {
    if (!this.child) return null;
    return {
      pid: this.child.pid,
      pendingRequests: this.pending.size,
      alive: true,
    };
  }
}
