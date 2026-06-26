/**
 * Relay engine — pipeline seam types.
 *
 * The abstract contract the staged pipeline depends on. The scheduler provides
 * production implementations (registry via WebsiteRegistryService + adapter,
 * parser via PostParsersService, file processing via RelayFileProcessor, etc.);
 * tests provide mocks. Keeping these here lets the planner and task-pass stay
 * focused on logic.
 */

import { SubmissionType } from '@postybirb/types';
import { CancellableToken } from '../models/cancellable-token';
import { PostingFile } from '../models/posting-file';
import { RelayTask } from './model';
import { RateLimiter } from './rate-limiter';
import { RelayTracer } from './tracer.service';
import { RelaySourceFile } from './transform';
import { RelayPostResult, RelayWebsite } from './websites';

/** Submission shape the engine needs to plan and run a job. */
export interface RelaySubmission {
  id: string;
  type: SubmissionType;
  title: string;
  files: Array<
    RelaySourceFile & {
      order: number;
      ignoredWebsites?: string[];
      /** User-provided source URLs for this file (file metadata). */
      sourceUrls?: string[];
    }
  >;
  options: Array<{ accountId: string; websiteId: string }>;
}

/**
 * Outcome of a single task pass. A pass either runs the task to completion
 * (every non-done unit dispatched) or stops early because a unit hit a
 * rate-limit gate and the task must be parked in WAITING. Genuine failures are
 * signalled by a thrown StageError, never by this result.
 */
export type TaskPassResult =
  | { outcome: 'completed' }
  | { outcome: 'rate_limited'; retryAfterMs: number };

/** Source-URL-bearing data dispatched to a website. */
export interface RelayDispatchData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  postData: any;
  sourceUrls: string[];
}

/**
 * Seams the pipeline needs. The scheduler provides production implementations
 * (registry via WebsiteRegistryService + adapter, parser via PostParsersService,
 * file processing via RelayFileProcessor, etc.); tests provide mocks.
 *
 * Context-bearing lookups take the owning jobId so concurrent jobs that share
 * an account resolve the correct per-job submission context.
 */
export interface PipelineDeps {
  getWebsite(jobId: string, websiteId: string, accountId: string): RelayWebsite;
  getSubmission(jobId: string): RelaySubmission;
  /**
   * Ensure the task's website/account session is authenticated before posting.
   * Optional so test mocks can omit it; production logs in (re-logging in if a
   * session has expired) and throws if it cannot establish a session.
   */
  authenticate?(task: RelayTask): Promise<void>;
  /** Build the parsed post data for a task, injecting upstream source URLs. */
  buildPostData(
    task: RelayTask,
    upstreamSourceUrls: string[],
  ): Promise<RelayDispatchData>;
  /** Validate the parsed data; return error messages (empty = ok). */
  validate(task: RelayTask, data: RelayDispatchData): Promise<string[]>;
  /**
   * Process a batch of files (convert/resize/thumbnail/verify) into
   * ready-to-post PostingFiles, injecting the given source URLs into metadata.
   */
  processBatch(
    task: RelayTask,
    fileIds: string[],
    sourceUrls: string[],
    token: CancellableToken,
  ): Promise<PostingFile[]>;
  /** Dispatch a batch of files. */
  dispatchFile(
    website: RelayWebsite,
    data: RelayDispatchData,
    files: PostingFile[],
    token: CancellableToken,
    batch: { index: number; totalBatches: number },
  ): Promise<RelayPostResult>;
  /** Dispatch a message. */
  dispatchMessage(
    website: RelayWebsite,
    data: RelayDispatchData,
    token: CancellableToken,
  ): Promise<RelayPostResult>;
  rateLimiter: RateLimiter;
  tracer: RelayTracer;
}
