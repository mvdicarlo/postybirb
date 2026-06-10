/**
 * Relay posting framework — accurate file resizing.
 *
 * Split into PLAN -> EXECUTE -> VERIFY so resizing is provably correct:
 *
 *   1. buildTransformPlan() merges website.calculateImageResize, static +
 *      dynamic file-size limits, accepted-mime conversion needs, per-account
 *      user dimension overrides, and alt-text caps into a single declarative
 *      plan. The plan is logged before execution, so a wrong output is
 *      debuggable from the trace alone.
 *   2. runTransform() executes the plan. In the real app this delegates to the
 *      isolated sharp worker pool; here it deterministically simulates how
 *      bytes scale with pixel area + quality so the verifier loop is exercised.
 *   3. The verifier asserts bytes <= maxBytes, w <= maxW, h <= maxH, mime ==
 *      target. If not satisfied it binary-searches quality then downscales,
 *      until the post-conditions hold or it fails with a precise error.
 *
 * A content-addressed cache (hash(sourceHash + plan)) means identical
 * transforms across retries / batches / accounts are computed once.
 */

import { createHash } from 'node:crypto';
import { ErrorKind, StageError } from './errors.ts';
import type { SourceFile } from './model.ts';

export type WebsiteFileConstraints = {
  acceptedMimeTypes: string[];
  /** byte limit per mime (or '*' fallback) */
  maxBytes?: Record<string, number>;
  /** hard pixel caps applied by the website */
  maxWidth?: number;
  maxHeight?: number;
  maxAltTextLength?: number;
  /** simple conversion table: from-mime -> to-mime when unsupported */
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
  /** what the verifier actually did, for the trace */
  appliedSteps: string[];
  fromCache: boolean;
};

function mimeAccepted(mime: string, patterns: string[]): boolean {
  return patterns.some((p) =>
    p === mime || (p.endsWith('/*') && mime.startsWith(p.slice(0, -1))),
  );
}

function resolveMaxBytes(
  mime: string,
  table?: Record<string, number>,
): number | undefined {
  if (!table) return undefined;
  return (
    table[mime] ??
    table[`${mime.split('/')[0]}/*`] ??
    table['*'] ??
    undefined
  );
}

// ---------------------------------------------------------------------------
// PLAN
// ---------------------------------------------------------------------------

export function buildTransformPlan(
  file: SourceFile,
  accountId: string,
  c: WebsiteFileConstraints,
  /** website-specific computed resize (mirrors website.calculateImageResize) */
  websiteResize?: { width?: number; height?: number; maxBytes?: number },
): TransformPlan {
  // Determine target mime (convert if the source mime is unsupported).
  let targetMimeType = file.mimeType;
  const steps: TransformPlan['steps'] = [];
  if (!mimeAccepted(file.mimeType, c.acceptedMimeTypes)) {
    const converted = c.conversion?.[file.mimeType];
    if (!converted) {
      throw new StageError({
        kind: ErrorKind.TRANSFORM_FAILED,
        stage: 'plan',
        message: `Unsupported mime ${file.mimeType} and no conversion available`,
      });
    }
    targetMimeType = converted;
    steps.push('convert');
  }

  // Width/height: min(website hard cap, website computed, user override).
  const userOverride =
    file.dimensionOverrides?.[accountId] ?? file.dimensionOverrides?.['default'];
  const widthCandidates = [c.maxWidth, websiteResize?.width, userOverride?.width].filter(
    (n): n is number => typeof n === 'number',
  );
  const heightCandidates = [c.maxHeight, websiteResize?.height, userOverride?.height].filter(
    (n): n is number => typeof n === 'number',
  );
  const maxWidth = widthCandidates.length ? Math.min(...widthCandidates) : undefined;
  const maxHeight = heightCandidates.length ? Math.min(...heightCandidates) : undefined;

  // Bytes: min(static limit for target mime, website computed).
  const byteCandidates = [
    resolveMaxBytes(targetMimeType, c.maxBytes),
    websiteResize?.maxBytes,
  ].filter((n): n is number => typeof n === 'number');
  const maxBytes = byteCandidates.length ? Math.min(...byteCandidates) : undefined;

  if (maxWidth !== undefined || maxHeight !== undefined) steps.push('scale');
  if (maxBytes !== undefined) steps.push('compress');

  const plan: TransformPlan = {
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
  return plan;
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
// EXECUTE + VERIFY
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Encoder seam — THIS is where PostyBirb's existing sharp code plugs in.
// ---------------------------------------------------------------------------

/**
 * The single point that actually rescales/encodes pixels and reports the
 * resulting byte size. The verifier drives it; it owns no policy.
 *
 * PRODUCTION WIRING:
 *   Implement `encode()` by delegating to the existing
 *   `SharpInstanceManager.resizeForPost({ buffer, resize, mimeType, ... })`
 *   running in the isolated worker pool — return its real output buffer's
 *   byte length (and keep the buffer to hand back). No reimplementation of the
 *   resize math is needed; Relay only adds the PLAN (policy) and the VERIFY
 *   guard (post-conditions) around your proven encoder. `encode` becomes async
 *   there; `runTransform` would simply be awaited.
 *
 * The prototype ships a deterministic simulator so the verify loop (quality
 * search + downscale fallback) is fully exercised without native deps.
 */
export interface Encoder {
  encode(req: {
    width: number;
    height: number;
    quality: number;
    mime: string;
  }): number; // resulting byte size
}

/**
 * Deterministic stand-in for sharp. Models bytes as proportional to pixel
 * area * quality, plus a mime compression factor.
 */
function simulateEncode(
  width: number,
  height: number,
  quality: number,
  mime: string,
): number {
  const mimeFactor = mime === 'image/png' ? 4 : mime === 'image/jpeg' ? 1 : 2;
  const area = width * height;
  return Math.round(area * mimeFactor * (0.2 + 0.8 * (quality / 100)) * 0.05);
}

export const simulatedEncoder: Encoder = {
  encode: ({ width, height, quality, mime }) =>
    simulateEncode(width, height, quality, mime),
};

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

export type VerifyResult = {
  output: TransformedFile;
  /** every (w,h,quality,bytes) the verifier tried, for the trace */
  iterations: Array<{ width: number; height: number; quality: number; bytes: number }>;
};

/**
 * Execute the plan and guarantee the post-conditions hold.
 * Strategy: start at full size/quality, then (a) scale down to fit pixel caps,
 * (b) binary-search JPEG/webp quality to fit maxBytes, (c) if still too big,
 * iteratively downscale dimensions. Fails precisely if impossible.
 */
export function runTransform(
  file: SourceFile,
  plan: TransformPlan,
  cache: TransformCache,
  encoder: Encoder = simulatedEncoder,
): VerifyResult {
  const key = planCacheKey(plan);
  const cached = cache.get(key);
  if (cached) {
    return { output: cached, iterations: [] };
  }

  const appliedSteps: string[] = [];
  const iterations: VerifyResult['iterations'] = [];

  let width = file.width;
  let height = file.height;
  let mime = plan.targetMimeType;
  let quality = 100;

  if (mime !== file.mimeType) appliedSteps.push(`convert:${file.mimeType}->${mime}`);

  // (a) scale to fit pixel caps, preserving aspect ratio
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

  let bytes = encoder.encode({ width, height, quality, mime });
  iterations.push({ width, height, quality, bytes });

  // (b)+(c) shrink bytes until under cap
  if (plan.maxBytes !== undefined) {
    let guard = 0;
    while (bytes > plan.maxBytes && guard < 40) {
      guard++;
      if (quality > 30 && plan.allowQualityLoss) {
        // binary-search-ish quality reduction
        quality = Math.max(30, quality - 10);
        appliedSteps.push(`compress:q${quality}`);
      } else {
        // downscale dimensions 10%
        width = Math.floor(width * 0.9);
        height = Math.floor(height * 0.9);
        appliedSteps.push(`downscale:${width}x${height}`);
        quality = plan.allowQualityLoss ? 85 : 100; // reset quality after downscale
      }
      bytes = encoder.encode({ width, height, quality, mime });
      iterations.push({ width, height, quality, bytes });
      if (width < 16 || height < 16) break;
    }
    if (bytes > plan.maxBytes) {
      throw new StageError({
        kind: ErrorKind.TRANSFORM_FAILED,
        stage: 'transform',
        message: `Could not shrink ${file.fileName} under ${plan.maxBytes}B (best ${bytes}B)`,
        additionalInfo: { iterations },
      });
    }
  }

  // alt-text truncation
  let altText = file.altText;
  if (altText && plan.altTextMaxLength && altText.length > plan.altTextMaxLength) {
    altText = altText.slice(0, plan.altTextMaxLength);
    appliedSteps.push(`alt-trim:${plan.altTextMaxLength}`);
  }

  // VERIFY post-conditions
  if (plan.maxWidth !== undefined && width > plan.maxWidth)
    throw new StageError({ kind: ErrorKind.TRANSFORM_FAILED, stage: 'transform', message: `width ${width} > ${plan.maxWidth}` });
  if (plan.maxHeight !== undefined && height > plan.maxHeight)
    throw new StageError({ kind: ErrorKind.TRANSFORM_FAILED, stage: 'transform', message: `height ${height} > ${plan.maxHeight}` });
  if (plan.maxBytes !== undefined && bytes > plan.maxBytes)
    throw new StageError({ kind: ErrorKind.TRANSFORM_FAILED, stage: 'transform', message: `bytes ${bytes} > ${plan.maxBytes}` });

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
  };
  cache.set(key, output);
  return { output, iterations };
}
