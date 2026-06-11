/**
 * Relay  production Encoder backed by the existing sharp worker pool.engine 
 *
 * Relay's transform planner/verifier owns the policy (target mime, max
 * dimensions/bytes) and the verify loop; the actual pixel work is delegated to
 * SharpInstanceManager.resizeForPost, which runs in isolated worker threads.
 * Each verify iteration performs a real encode and returns both the byte size
 * (to drive the loop) and the encoded buffer (so the converged result carries
 * the exact bytes that get posted).
 */

import { Injectable } from '@nestjs/common';
import { ImageResizeProps } from '@postybirb/types';
import { SharpInstanceManager } from '../../image-processing/sharp-instance-manager';
import { EncodeRequest, EncodeResult, Encoder } from './transform';

@Injectable()
export class SharpEncoder implements Encoder {
  constructor(private readonly sharp: SharpInstanceManager) {}

  async encode(req: EncodeRequest): Promise<EncodeResult> {
    if (!req.source) {
      // No source buffer (planning/preview without bytes): estimate by area so
      // the verify loop still converges deterministically.
      return { bytes: req.width * req.height };
    }

    const resize: ImageResizeProps = {
      width: req.width,
      height: req.height,
      allowQualityLoss: req.quality < 100,
      outputMimeType: req.mime,
    };

    const result = await this.sharp.resizeForPost({
      buffer: req.source.buffer,
      resize,
      mimeType: req.source.mimeType,
      fileName: req.source.fileName,
      fileId: req.source.fileId,
      fileWidth: req.source.width,
      fileHeight: req.source.height,
      generateThumbnail: false,
    });

    const buffer = result.buffer ?? req.source.buffer;
    return { bytes: buffer.byteLength, buffer };
  }
}
