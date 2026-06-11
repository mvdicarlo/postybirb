/* eslint-disable max-classes-per-file */
/**
 * Relay engine — accurate file resizing (PLAN -> EXECUTE -> VERIFY).
 *
 *   1. buildTransformPlan() merges website.calculateImageResize, static +
 *      dynamic file-size limits, accepted-mime conversion needs, per-account
 *      user dimension overrides, and alt-text caps into one declarative plan.
 *   2. runTransform() executes the plan via a swappable {@link Encoder}
 *      (SharpEncoder wraps the existing SharpInstanceManager worker pool).
 *   3. The verifier asserts bytes/width/height/mime satisfy the plan, iterating
 *      quality then downscale until they hold or failing precisely.
 *
 * A content-addressed cache (hash(sourceHash + plan)) computes identical
 * transforms once across retries / batches / accounts.
 */

import { PostErrorKind } from '@postybirb/types';
import { createHash } from 'node:crypto';
import { StageError } from './errors';

export type RelaySourceFile = {
  id: string;
  fileName: string;
  mimeType: string;
  width: number;
  height: number;
  bytes: number;
  hash: string;
  altText?: string;
  dimensionOverrides?: Record<string, { width?: number; height?: number }>;
  /**
   * The raw source bytes. Required for real encoding/dispatch; optional so the
   * planner and unit tests can operate on metadata alone.
   */
  buffer?: Buffer;
};

export type WebsiteFileConstraints = {
  acceptedMimeTypes: string[];
  maxBytes?: Record<string, number>;
  maxWidth?: number;
  maxHeight?: number;
  maxAltTextLength?: number;
  conversion?: Record<string, string>;
};

export type TransformPlan = {
  fileId: string;
  sourceHash: string;
  targetMimeType: string;
  maxWidth?: number;
  maxHeight?: number;
  maxBytes?: number;
  allowQualityLoss: boolean;
  altTextMaxLength?: number;
  steps: Array<'convert' | 'scale' | 'compress' | 'thumbnail'>;
};

export type TransformedFile = {
  fileId: string;
  fileName: string;
  mimeType: string;
  width: number;
  height: number;
  bytes: number;
  quality: number;
  altText?: string;
  appliedSteps: string[];
  fromCache: boolean;
  /** The final encoded bytes (present when a real encoder produced them). */
  buffer?: Buffer;
};

function mimeAccepted(mime: string, patterns: string[]): boolean {
  return patterns.some(
    (p) => p === mime || (p.endsWith('/*') && mime.startsWith(p.slice(0, -1))),
  );
}

function resolveMaxBytes(
  mime: string,
  table?: Record<string, number>,
): number | undefined {
  if (!table) return undefined;
  return table[mime] ?? table[`${mime.split('/')[0]}/*`] ?? table['*'];
}

// ---------------------------------------------------------------------------
// PLAN
// ---------------------------------------------------------------------------

export function buildTransformPlan(
  file: RelaySourceFile,
  accountId: string,
  c: WebsiteFileConstraints,
  websiteResize?: { width?: number; height?: number; maxBytes?: number },
): TransformPlan {
  let targetMimeType = file.mimeType;
  const steps: TransformPlan['steps'] = [];
  if (!mimeAccepted(file.mimeType, c.acceptedMimeTypes)) {
    const converted = c.conversion?.[file.mimeType];
    if (!converted) {
      throw new StageError({
        kind: PostErrorKind.TRANSFORM_FAILED,
        stage: 'plan',
        message: `Unsupported mime ${file.mimeType} and no conversion available`,
      });
    }
    targetMimeType = converted;
    steps.push('convert');
  }

  const userOverride =
    file.dimensionOverrides?.[accountId] ?? file.dimensionOverrides?.default;
  const widthCandidates = [
    c.maxWidth,
    websiteResize?.width,
    userOverride?.width,
  ].filter((n): n is number => typeof n === 'number');
  const heightCandidates = [
    c.maxHeight,
    websiteResize?.height,
    userOverride?.height,
  ].filter((n): n is number => typeof n === 'number');
  const maxWidth = widthCandidates.length
    ? Math.min(...widthCandidates)
    : undefined;
  const maxHeight = heightCandidates.length
    ? Math.min(...heightCandidates)
    : undefined;

  const byteCandidates = [
    resolveMaxBytes(targetMimeType, c.maxBytes),
    websiteResize?.maxBytes,
  ].filter((n): n is number => typeof n === 'number');
  const maxBytes = byteCandidates.length ? Math.min(...byteCandidates) : undefined;

  if (maxWidth !== undefined || maxHeight !== undefined) steps.push('scale');
  if (maxBytes !== undefined) steps.push('compress');

  return {
    fileId: file.id,
    sourceHash: file.hash,
    targetMimeType,
    maxWidth,
    maxHeight,
    maxBytes,
    allowQualityLoss: true,
    altTextMaxLength: c.maxAltTextLength,
    steps,
  };
}

export function planCacheKey(plan: TransformPlan): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        h: plan.sourceHash,
        m: plan.targetMimeType,
        w: plan.maxWidth ?? null,
        ht: plan.maxHeight ?? null,
        b: plan.maxBytes ?? null,
        q: plan.allowQualityLoss,
      }),
    )
    .digest('hex')
    .slice(0, 16);
}

// ---------------------------------------------------------------------------
// Encoder seam — SharpEncoder (production) wraps SharpInstanceManager.
// ---------------------------------------------------------------------------

/** The encode request the verifier issues. */
export interface EncodeRequest {
  width: number;
  height: number;
  quality: number;
  mime: string;
  /** Source bytes + metadata, when a real encoder needs them. */
  source?: {
    buffer: Buffer;
    mimeType: string;
    width: number;
    height: number;
    fileName: string;
    fileId: string;
  };
}

/** Result of an encode pass. */
export interface EncodeResult {
  bytes: number;
  /** The encoded bytes (present for real encoders). */
  buffer?: Buffer;
}

/**
 * The single point that rescales/encodes pixels and reports byte size.
 * The verifier drives it; it owns no policy. {@link SimulatedEncoder} is used
 * in unit tests; the production {@link SharpEncoder} delegates to the existing
 * sharp worker pool.
 */
export interface Encoder {
  encode(req: EncodeRequest): EncodeResult | Promise<EncodeResult>;
}

/**
 * Deterministic encoder used by unit tests: models bytes as proportional to
 * pixel area * quality with a per-mime factor. Lets the verify loop be tested
 * without native deps.
 */
export class SimulatedEncoder implements Encoder {
  encode(req: EncodeRequest): EncodeResult {
    const mimeFactor =
      req.mime === 'image/png' ? 4 : req.mime === 'image/jpeg' ? 1 : 2;
    const area = req.width * req.height;
    const bytes = Math.round(
      area * mimeFactor * (0.2 + 0.8 * (req.quality / 100)) * 0.05,
    );
    return { bytes };
  }
}

export const simulatedEncoder = new SimulatedEncoder();

// ---------------------------------------------------------------------------
// CACHE
// ---------------------------------------------------------------------------

export class TransformCache {
  private readonly store = new Map<string, TransformedFile>();
  hits = 0;
  misses = 0;

  get(key: string): TransformedFile | undefined {
    const v = this.store.get(key);
    if (v) {
      this.hits++;
      return { ...v, fromCache: true };
    }
    this.misses++;
    return undefined;
  }

  set(key: string, value: TransformedFile): void {
    this.store.set(key, { ...value, fromCache: false });
  }
}

// ---------------------------------------------------------------------------
// EXECUTE + VERIFY
// ---------------------------------------------------------------------------

export type VerifyResult = {
  output: TransformedFile;
  iterations: Array<{
    width: number;
    height: number;
    quality: number;
    bytes: number;
  }>;
};

/**
 * Execute the plan and guarantee the post-conditions hold.
 * Strategy: scale to fit pixel caps, binary-search quality to fit maxBytes,
 * then downscale if still too big. Fails precisely if impossible.
 */
export async function runTransform(
  file: RelaySourceFile,
  plan: TransformPlan,
  cache: TransformCache,
  encoder: Encoder = simulatedEncoder,
): Promise<VerifyResult> {
  const key = planCacheKey(plan);
  const cached = cache.get(key);
  if (cached) return { output: cached, iterations: [] };

  const appliedSteps: string[] = [];
  const iterations: VerifyResult['iterations'] = [];

  let { width, height } = file;
  const mime = plan.targetMimeType;
  let quality = 100;

  if (mime !== file.mimeType) {
    appliedSteps.push(`convert:${file.mimeType}->${mime}`);
  }

  const scale = Math.min(
    plan.maxWidth ? plan.maxWidth / width : 1,
    plan.maxHeight ? plan.maxHeight / height : 1,
    1,
  );
  if (scale < 1) {
    width = Math.floor(width * scale);
    height = Math.floor(height * scale);
    appliedSteps.push(`scale:${scale.toFixed(3)}`);
  }

  const source = file.buffer
    ? {
        buffer: file.buffer,
        mimeType: file.mimeType,
        width: file.width,
        height: file.height,
        fileName: file.fileName,
        fileId: file.id,
      }
    : undefined;

  let enc = await encoder.encode({ width, height, quality, mime, source });
  let { bytes } = enc;
  iterations.push({ width, height, quality, bytes });

  if (plan.maxBytes !== undefined) {
    let guard = 0;
    while (bytes > plan.maxBytes && guard < 40) {
      guard++;
      if (quality > 30 && plan.allowQualityLoss) {
        quality = Math.max(30, quality - 10);
        appliedSteps.push(`compress:q${quality}`);
      } else {
        width = Math.floor(width * 0.9);
        height = Math.floor(height * 0.9);
        appliedSteps.push(`downscale:${width}x${height}`);
        quality = plan.allowQualityLoss ? 85 : 100;
      }
      // eslint-disable-next-line no-await-in-loop
      enc = await encoder.encode({ width, height, quality, mime, source });
      bytes = enc.bytes;
      iterations.push({ width, height, quality, bytes });
      if (width < 16 || height < 16) break;
    }
    if (bytes > plan.maxBytes) {
      throw new StageError({
        kind: PostErrorKind.TRANSFORM_FAILED,
        stage: 'transform',
        message: `Could not shrink ${file.fileName} under ${plan.maxBytes}B (best ${bytes}B)`,
        additionalInfo: { iterations },
      });
    }
  }

  let { altText } = file;
  if (
    altText &&
    plan.altTextMaxLength &&
    altText.length > plan.altTextMaxLength
  ) {
    altText = altText.slice(0, plan.altTextMaxLength);
    appliedSteps.push(`alt-trim:${plan.altTextMaxLength}`);
  }

  if (plan.maxWidth !== undefined && width > plan.maxWidth) {
    throw new StageError({
      kind: PostErrorKind.TRANSFORM_FAILED,
      stage: 'transform',
      message: `width ${width} > ${plan.maxWidth}`,
    });
  }
  if (plan.maxHeight !== undefined && height > plan.maxHeight) {
    throw new StageError({
      kind: PostErrorKind.TRANSFORM_FAILED,
      stage: 'transform',
      message: `height ${height} > ${plan.maxHeight}`,
    });
  }
  if (plan.maxBytes !== undefined && bytes > plan.maxBytes) {
    throw new StageError({
      kind: PostErrorKind.TRANSFORM_FAILED,
      stage: 'transform',
      message: `bytes ${bytes} > ${plan.maxBytes}`,
    });
  }

  const ext = mime.split('/')[1] ?? 'bin';
  const output: TransformedFile = {
    fileId: file.id,
    fileName: `${file.id}.${ext}`,
    mimeType: mime,
    width,
    height,
    bytes,
    quality,
    altText,
    appliedSteps,
    fromCache: false,
    buffer: enc.buffer,
  };
  cache.set(key, output);
  return { output, iterations };
}
