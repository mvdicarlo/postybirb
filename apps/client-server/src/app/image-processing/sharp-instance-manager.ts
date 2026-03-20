import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Logger } from '@postybirb/logger';
import { ImageResizeProps } from '@postybirb/types';
import { IsTestEnvironment } from '@postybirb/utils/electron';
import { existsSync } from 'fs';
import { cpus } from 'os';
import { join, resolve } from 'path';
import Piscina from 'piscina';

/**
 * Input sent to the sharp worker thread.
 */
export interface SharpWorkerInput {
  operation: 'resize' | 'metadata' | 'thumbnail';
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
 * Result returned from the sharp worker thread.
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
 * Manages a pool of worker threads that run sharp image processing.
 *
 * This isolates sharp/libvips native code from the main process so that
 * if libvips segfaults (e.g. after long idle periods), only the worker
 * dies — the main process survives and piscina spawns a replacement.
 *
 * @class SharpInstanceManager
 */
@Injectable()
export class SharpInstanceManager implements OnModuleDestroy {
  private readonly logger = Logger();

  private pool: Piscina | null = null;

  /**
   * In test mode, we call the worker function directly in-process to avoid
   * thread contention issues with the electron test runner. The sharp logic
   * is still fully exercised — only the threading is bypassed.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private workerFn: ((input: any) => Promise<any>) | null = null;

  /**
   * Shared pool instance. Piscina pools are heavyweight (spawn OS threads),
   * so we share one across all NestJS module instances within the same
   * process. This avoids exhausting thread resources when multiple
   * TestingModules are created (e.g. during parallel test execution).
   */
  private static sharedPool: Piscina | null = null;

  private static sharedPoolRefCount = 0;

  constructor() {
    const workerPath = this.resolveWorkerPath();

    if (IsTestEnvironment()) {
      // In tests: call the worker function directly (no threads)
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      this.workerFn = require(workerPath);
    } else {
      // Production: use piscina for crash isolation
      if (!SharpInstanceManager.sharedPool) {
        const maxThreads = Math.min(cpus().length, 4);

        this.logger
          .withMetadata({ workerPath, maxThreads })
          .info('Initializing sharp worker pool');

        SharpInstanceManager.sharedPool = new Piscina({
          filename: workerPath,
          maxThreads,
          minThreads: 0, // Allow ALL workers to be reaped after idle
          idleTimeout: 60_000, // Kill idle workers after 60s
        });
      }

      SharpInstanceManager.sharedPoolRefCount++;
      this.pool = SharpInstanceManager.sharedPool;
    }
  }

  async onModuleDestroy() {
    if (!this.pool) return; // Test mode — nothing to clean up

    SharpInstanceManager.sharedPoolRefCount--;

    if (
      SharpInstanceManager.sharedPoolRefCount <= 0 &&
      SharpInstanceManager.sharedPool
    ) {
      this.logger.info('Destroying sharp worker pool (last reference)');
      const pool = SharpInstanceManager.sharedPool;
      SharpInstanceManager.sharedPool = null;
      SharpInstanceManager.sharedPoolRefCount = 0;
      try {
        await pool.destroy();
      } catch {
        // pool.destroy() throws for in-flight tasks — safe to ignore
      }
    }
  }

  /**
   * Cached resolved path — avoids repeated filesystem probing.
   */
  private static resolvedWorkerPath: string | null = null;

  /**
   * Resolve the path to the sharp-worker.js file.
   * Searches multiple candidate locations to work in:
   * - Production build (webpack output): __dirname/assets/sharp-worker.js
   * - Jest via ts-jest/swc: __dirname relative to source tree
   * - Electron test runner: may change __dirname/cwd, so walk up to find it
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
      join(process.cwd(), 'apps', 'client-server', 'src', 'assets', 'sharp-worker.js'),
      // cwd-based (jest may cd into apps/client-server)
      join(process.cwd(), 'src', 'assets', 'sharp-worker.js'),
    ];

    // Walk up from __dirname looking for the assets folder (handles
    // any depth of __dirname that test runners might produce)
    let dir = __dirname;
    for (let i = 0; i < 10; i++) {
      const candidate = join(dir, 'assets', 'sharp-worker.js');
      if (!candidates.includes(candidate)) {
        candidates.push(candidate);
      }
      const parent = resolve(dir, '..');
      if (parent === dir) break; // reached filesystem root
      dir = parent;
    }

    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        SharpInstanceManager.resolvedWorkerPath = candidate;
        return candidate;
      }
    }

    this.logger.warn(
      `Sharp worker not found in any candidate path. Checked: ${candidates.join(', ')}`,
    );
    // Return the build path as last resort — will fail at runtime with
    // a clear error from piscina rather than silently misbehaving.
    return candidates[0];
  }

  /**
   * Process an image using the worker pool.
   *
   * Buffers are copied to the worker via structured clone — the caller's
   * original buffers are NOT detached and remain usable after the call.
   * This means peak memory for a single operation is roughly
   * 2× the input size (original + worker copy).
   */
  async processImage(input: SharpWorkerInput): Promise<SharpWorkerResult> {
    try {
      // In test mode, call the worker function directly (no threads)
      if (this.workerFn) {
        return (await this.workerFn(input)) as SharpWorkerResult;
      }

      const result = await this.pool.run(input);

      // Structured clone across worker threads converts Node.js Buffers
      // into plain Uint8Arrays. Re-wrap them so downstream consumers
      // (e.g. form-data) that rely on Buffer methods/stream semantics work.
      if (result.buffer && !Buffer.isBuffer(result.buffer)) {
        result.buffer = Buffer.from(result.buffer);
      }
      if (result.thumbnailBuffer && !Buffer.isBuffer(result.thumbnailBuffer)) {
        result.thumbnailBuffer = Buffer.from(result.thumbnailBuffer);
      }

      return result as SharpWorkerResult;
    } catch (error) {
      this.logger
        .withError(error)
        .error('Sharp worker error — worker may have crashed');
      throw error;
    }
  }

  /**
   * Get metadata for an image buffer.
   * @param buffer - The image buffer
   * @returns width, height, format, mimeType
   */
  async getMetadata(
    buffer: Buffer,
  ): Promise<{
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
   * Get pool statistics for monitoring.
   */
  getStats() {
    if (!this.pool) return null;
    return {
      completed: this.pool.completed,
      duration: this.pool.duration,
      utilization: this.pool.utilization,
      queueSize: this.pool.queueSize,
    };
  }
}
