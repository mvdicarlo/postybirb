import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Logger } from '@postybirb/logger';
import { ImageResizeProps } from '@postybirb/types';
import { existsSync } from 'fs';
import { cpus } from 'os';
import { join } from 'path';
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

  private pool: Piscina;

  constructor() {
    const workerPath = this.resolveWorkerPath();
    const maxThreads = Math.min(cpus().length, 4);

    this.logger
      .withMetadata({ workerPath, maxThreads })
      .info('Initializing sharp worker pool');

    this.pool = new Piscina({
      filename: workerPath,
      maxThreads,
      minThreads: 0, // Allow ALL workers to be reaped after idle
      idleTimeout: 60_000, // Kill idle workers after 60s
    });
  }

  async onModuleDestroy() {
    if (this.pool) {
      this.logger.info('Destroying sharp worker pool');
      await this.pool.destroy();
    }
  }

  /**
   * Resolve the path to the sharp-worker.js file.
   * Works in:
   * - Production build: __dirname/assets/sharp-worker.js
   * - Development/test: relative to source directory
   */
  private resolveWorkerPath(): string {
    // Production/build path: assets are next to the bundled main.js
    const buildPath = join(__dirname, 'assets', 'sharp-worker.js');
    if (existsSync(buildPath)) {
      return buildPath;
    }

    // Development/test: look relative to the source tree
    // __dirname is typically apps/client-server/src/app/image-processing
    const srcPath = join(
      __dirname,
      '..',
      '..',
      '..',
      'assets',
      'sharp-worker.js',
    );
    if (existsSync(srcPath)) {
      return srcPath;
    }

    // Fallback: try workspace root assets
    const workspacePath = join(
      process.cwd(),
      'apps',
      'client-server',
      'src',
      'assets',
      'sharp-worker.js',
    );
    if (existsSync(workspacePath)) {
      return workspacePath;
    }

    this.logger.warn(
      `Sharp worker not found at expected paths: ${buildPath}, ${srcPath}, ${workspacePath}. Falling back to build path.`,
    );
    return buildPath;
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
