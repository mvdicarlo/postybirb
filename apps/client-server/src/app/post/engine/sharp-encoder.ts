/**
 * Relay engine — production Encoder backed by the existing sharp worker pool.
 *
 * Relay's transform planner/verifier owns the policy (target mime, max
 * dimensions/bytes) and the verify loop; the actual pixel work is delegated to
 * SharpInstanceManager.resizeForPost, which already runs in isolated worker
 * threads. This adapter reports the encoded byte length back to the verifier.
 *
 * NOTE: This wires the seam. Threading the resulting buffers through to the
 * website dispatch (so we post the resized bytes, not just measure them) lands
 * with the pipeline/persistence work in a later PR; for now the planner +
 * verify loop drive the real encoder for accurate sizing.
 */

import { Injectable } from '@nestjs/common';
import { ImageResizeProps } from '@postybirb/types';
import { SharpInstanceManager } from '../../image-processing/sharp-instance-manager';
import { Encoder } from './transform';

@Injectable()
export class SharpEncoder implements Encoder {
  constructor(private readonly sharp: SharpInstanceManager) {}

  /**
   * Encode at the requested dimensions/quality/mime and return the byte size.
   * The verifier calls this repeatedly; the worker pool keeps the main process
   * safe from libvips crashes.
   */
  async encode(req: {
    width: number;
    height: number;
    quality: number;
    mime: string;
    buffer?: Buffer;
    sourceMime?: string;
    fileName?: string;
    fileId?: string;
    sourceWidth?: number;
    sourceHeight?: number;
  }): Promise<number> {
    if (!req.buffer) {
      // No source buffer provided (e.g. planning/preview); cannot encode for
      // real, so signal "unknown" by returning the requested area as a proxy.
      return req.width * req.height;
    }

    const resize: ImageResizeProps = {
      width: req.width,
      height: req.height,
      allowQualityLoss: req.quality < 100,
      outputMimeType: req.mime,
    };

    const result = await this.sharp.resizeForPost({
      buffer: req.buffer,
      resize,
      mimeType: req.sourceMime ?? req.mime,
      fileName: req.fileName ?? `${req.fileId ?? 'file'}`,
      fileId: req.fileId ?? 'file',
      fileWidth: req.sourceWidth ?? req.width,
      fileHeight: req.sourceHeight ?? req.height,
      generateThumbnail: false,
    });

    return result.buffer?.byteLength ?? 0;
  }
}
