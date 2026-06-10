/**
 * Relay posting framework — website contract + mock implementations.
 *
 * Keeps the spirit of the existing website contract (onPostFileSubmission /
 * onPostMessageSubmission / calculateImageResize / validate / constraints) so
 * real website implementations need minimal adaptation. Only the orchestration
 * around them changes.
 *
 * The mocks below exercise the interesting paths:
 *   - furaffinity : single-file batches, jpeg/png only, rate-limited
 *   - weasyl      : batch size 3, tight byte cap (forces resize), alt-text cap
 *   - bluesky     : message + small images, accepts EXTERNAL source urls (runs
 *                   last and seeds its body with upstream URLs)
 *   - flaky       : transient failure on first attempt (demonstrates retry)
 *   - mastodon    : message-only
 */

import { ErrorKind, StageError } from './errors.ts';
import type { SourceFile } from './model.ts';
import type { TransformedFile, WebsiteFileConstraints } from './transform.ts';

export type ParsedPostData = {
  title: string;
  description: string;
  tags: string[];
  /** external source urls injected from upstream tasks (propagation) */
  sourceUrls: string[];
};

export type PostResult = {
  sourceUrl: string;
  message?: string;
};

export type PostContext = {
  signal: AbortSignal;
  attempt: number;
};

export interface Website {
  id: string;
  displayName: string;
  supportsFile: boolean;
  supportsMessage: boolean;
  /** ms between posts; 0 = none */
  minimumPostWaitInterval: number;
  /**
   * What the rate-limit window is keyed by:
   *  - 'account'        : per login (default; most sites)
   *  - 'website'        : global across all accounts on this website
   *  - 'website+account': both (rare; e.g. shared IP + per-user limits)
   */
  rateLimitScope?: 'account' | 'website' | 'website+account';
  fileBatchSize: number;
  /** if true, this site is posted later and receives upstream source urls */
  acceptsExternalSourceUrls: boolean;
  /**
   * How many upstream source URLs this site needs before it may post.
   *  - 'all' (default) : wait for every standard task
   *  - 'any'           : post as soon as the first upstream URL exists
   *  - { count: n }    : wait for n upstream URLs
   */
  sourceDependencyMode?: 'all' | 'any' | { count: number };
  fileConstraints?: WebsiteFileConstraints;

  calculateImageResize?(
    file: SourceFile,
  ): { width?: number; height?: number; maxBytes?: number } | undefined;

  validate(data: ParsedPostData): { errors: string[] };

  onPostFileSubmission?(
    data: ParsedPostData,
    files: TransformedFile[],
    ctx: PostContext,
    batch: { index: number; total: number },
  ): Promise<PostResult>;

  onPostMessageSubmission?(
    data: ParsedPostData,
    ctx: PostContext,
  ): Promise<PostResult>;
}

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal.aborted) return reject(new Error('aborted'));
    const t = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => {
      clearTimeout(t);
      reject(new Error('aborted'));
    });
  });

// ---------------------------------------------------------------------------
// Mock websites
// ---------------------------------------------------------------------------

const IMAGE_ONLY: WebsiteFileConstraints = {
  acceptedMimeTypes: ['image/jpeg', 'image/png'],
  conversion: { 'image/webp': 'image/png', 'image/gif': 'image/png' },
};

export const furaffinity: Website = {
  id: 'furaffinity',
  displayName: 'FurAffinity',
  supportsFile: true,
  supportsMessage: false,
  minimumPostWaitInterval: 1500,
  fileBatchSize: 1,
  acceptsExternalSourceUrls: false,
  fileConstraints: { ...IMAGE_ONLY, maxBytes: { '*': 10_000_000 } },
  calculateImageResize: () => ({ width: 1280, height: 1280 }),
  validate: (d) => ({ errors: d.title ? [] : ['title required'] }),
  onPostFileSubmission: async (data, files, ctx) => {
    await sleep(40, ctx.signal);
    return {
      sourceUrl: `https://furaffinity.net/view/${Math.floor(Math.random() * 1e6)}`,
      message: `posted ${files.length} file(s)`,
    };
  },
};

export const weasyl: Website = {
  id: 'weasyl',
  displayName: 'Weasyl',
  supportsFile: true,
  supportsMessage: false,
  minimumPostWaitInterval: 0,
  fileBatchSize: 3,
  acceptsExternalSourceUrls: false,
  fileConstraints: {
    ...IMAGE_ONLY,
    maxBytes: { '*': 250_000 }, // tight: forces the verifier loop to work
    maxWidth: 2000,
    maxHeight: 2000,
    maxAltTextLength: 40,
  },
  validate: () => ({ errors: [] }),
  onPostFileSubmission: async (data, files, ctx, batch) => {
    await sleep(30, ctx.signal);
    return {
      sourceUrl: `https://weasyl.com/~art/${batch.index}-${Math.floor(Math.random() * 1e6)}`,
      message: `batch ${batch.index + 1}/${batch.total}`,
    };
  },
};

export const flaky: Website = {
  id: 'flaky',
  displayName: 'FlakySite',
  supportsFile: true,
  supportsMessage: false,
  minimumPostWaitInterval: 0,
  fileBatchSize: 2,
  acceptsExternalSourceUrls: false,
  fileConstraints: { ...IMAGE_ONLY, maxBytes: { '*': 5_000_000 } },
  validate: () => ({ errors: [] }),
  onPostFileSubmission: async (data, files, ctx) => {
    await sleep(20, ctx.signal);
    // Fail with a transient error on the very first attempt to demo retry.
    if (ctx.attempt === 1) {
      throw new StageError({
        kind: ErrorKind.TRANSIENT,
        stage: 'dispatch',
        message: 'flaky: temporary 503 from upstream',
        retryAfterMs: 50,
      });
    }
    return {
      sourceUrl: `https://flaky.example/p/${Math.floor(Math.random() * 1e6)}`,
    };
  },
};

export const mastodon: Website = {
  id: 'mastodon',
  displayName: 'Mastodon',
  supportsFile: false,
  supportsMessage: true,
  minimumPostWaitInterval: 0,
  fileBatchSize: 1,
  acceptsExternalSourceUrls: false,
  validate: (d) => ({ errors: d.description ? [] : ['description required'] }),
  onPostMessageSubmission: async (data, ctx) => {
    await sleep(25, ctx.signal);
    return { sourceUrl: `https://mastodon.social/@me/${Math.floor(Math.random() * 1e6)}` };
  },
};

export const bluesky: Website = {
  id: 'bluesky',
  displayName: 'Bluesky',
  supportsFile: true,
  supportsMessage: true,
  minimumPostWaitInterval: 0,
  fileBatchSize: 4,
  acceptsExternalSourceUrls: true, // runs last, receives upstream urls
  fileConstraints: {
    acceptedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxBytes: { '*': 1_000_000 },
    maxWidth: 2048,
    maxHeight: 2048,
  },
  validate: () => ({ errors: [] }),
  onPostFileSubmission: async (data, files, ctx) => {
    await sleep(20, ctx.signal);
    // The body would embed upstream source urls (propagation proof).
    return {
      sourceUrl: `https://bsky.app/profile/me/post/${Math.floor(Math.random() * 1e6)}`,
      message: `embedded ${data.sourceUrls.length} source url(s)`,
    };
  },
};

/**
 * A crosspost relay that only needs ONE upstream source URL before it fires
 * (sourceDependencyMode 'any'). Demonstrates partial-dependency gating.
 */
export const crosspost: Website = {
  id: 'crosspost',
  displayName: 'Crosspost Relay',
  supportsFile: false,
  supportsMessage: true,
  minimumPostWaitInterval: 0,
  fileBatchSize: 1,
  acceptsExternalSourceUrls: true,
  sourceDependencyMode: 'any',
  validate: () => ({ errors: [] }),
  onPostMessageSubmission: async (data, ctx) => {
    await sleep(15, ctx.signal);
    return {
      sourceUrl: `https://crosspost.example/${Math.floor(Math.random() * 1e6)}`,
      message: `relayed with ${data.sourceUrls.length} upstream url(s)`,
    };
  },
};

export class WebsiteRegistry {
  private readonly sites = new Map<string, Website>();
  constructor(sites: Website[]) {
    for (const s of sites) this.sites.set(s.id, s);
  }
  get(id: string): Website {
    const s = this.sites.get(id);
    if (!s) {
      throw new StageError({
        kind: ErrorKind.FATAL,
        stage: 'resolve',
        message: `Unknown website ${id}`,
      });
    }
    return s;
  }
}

/**
 * A site that is "down" (fails its 2nd batch with a transient error) until
 * recovered. Used to demonstrate resume: the first batch SUCCEEDS and is
 * preserved; after recovery, resume re-runs only the failed batch.
 */
export const downSiteState = { recovered: false };

export const downThenUp: Website = {
  id: 'downthenup',
  displayName: 'DownThenUp',
  supportsFile: true,
  supportsMessage: false,
  minimumPostWaitInterval: 0,
  fileBatchSize: 2,
  acceptsExternalSourceUrls: false,
  fileConstraints: { ...IMAGE_ONLY, maxBytes: { '*': 5_000_000 } },
  validate: () => ({ errors: [] }),
  onPostFileSubmission: async (data, files, ctx, batch) => {
    await sleep(15, ctx.signal);
    // Second batch fails while the site is "down".
    if (!downSiteState.recovered && batch.index > 0) {
      throw new StageError({
        kind: ErrorKind.TRANSIENT,
        stage: 'dispatch',
        message: 'downthenup: gateway timeout on batch 2',
      });
    }
    return {
      sourceUrl: `https://downthenup.example/p/${batch.index}-${Math.floor(
        Math.random() * 1e6,
      )}`,
    };
  },
};

export const defaultRegistry = new WebsiteRegistry([
  furaffinity,
  weasyl,
  flaky,
  mastodon,
  bluesky,
  downThenUp,
  crosspost,
]);
