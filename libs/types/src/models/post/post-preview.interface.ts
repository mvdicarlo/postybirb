/**
 * Dry-run preview result types for the Relay posting engine.
 *
 * Produced by the preview endpoint (`GET /post/:id/preview`), which runs the
 * resolve + file-processing stages of the pipeline WITHOUT dispatching to any
 * website. Lets the UI show, per account, exactly how each file would be
 * converted/resized before a real post.
 */

import { SubmissionType } from '../../enums';

/** Before/after dimensions for a single previewed file. */
export interface PreviewFileDimensions {
  width: number;
  height: number;
  bytes: number;
  mimeType: string;
}

/** How a single file would be processed for one account. */
export interface PreviewFileResult {
  fileId: string;
  fileName: string;
  from: PreviewFileDimensions;
  /** Resulting file after conversion/resize (absent if excluded or errored). */
  to?: PreviewFileDimensions;
  /** True when the file is ignored for this account. */
  excluded?: boolean;
  /** Set when processing this file failed (e.g. unsupported type). */
  error?: string;
}

/** Preview for one website + account pairing. */
export interface PreviewTaskResult {
  websiteId: string;
  accountId: string;
  /** Whether the website supports this submission type. */
  supported: boolean;
  files: PreviewFileResult[];
}

/** Full dry-run preview for a submission. */
export interface PreviewResult {
  submissionId: string;
  type: SubmissionType;
  tasks: PreviewTaskResult[];
}
