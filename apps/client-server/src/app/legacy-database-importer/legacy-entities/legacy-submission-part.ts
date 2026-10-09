/* eslint-disable no-underscore-dangle */
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Legacy submission part entity from PostyBirb Plus.
 * Represents per-website options for a submission.
 *
 * In legacy, submission parts are stored in a separate `submission-part.db` file.
 * Each part has a generated _id of `${submissionId}-${accountId}`.
 *
 * For templates, parts are stored inline in the template's `parts` record
 * keyed by accountId (with 'default' for the default part).
 */
export class LegacySubmissionPart {
  _id: string;

  data: any; // Website-specific options (varies by website)

  accountId: string;

  submissionId: string;

  website: string;

  isDefault: boolean;

  postedTo?: string;

  postStatus: string; // 'SUCCESS' | 'FAILED' | 'UNPOSTED' | 'CANCELLED'

  created?: number;

  lastUpdated?: number;

  constructor(data: Partial<LegacySubmissionPart>) {
    Object.assign(this, data);
  }
}
