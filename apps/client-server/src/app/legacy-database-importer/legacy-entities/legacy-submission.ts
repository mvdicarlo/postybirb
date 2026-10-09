/* eslint-disable no-underscore-dangle */

/**
 * Legacy file record from PostyBirb Plus file submissions.
 * Represents a file stored on disk by the legacy application.
 */
export interface LegacyFileRecord {
  location: string;
  mimetype: string;
  name: string;
  order?: number;
  originalPath?: string;
  preview: string;
  size: number;
  height?: number;
  width?: number;
  type: string; // IMAGE | TEXT | VIDEO | AUDIO | UNKNOWN
  ignoredAccounts?: string[];
  altText?: string;
}

/**
 * Legacy submission schedule from PostyBirb Plus.
 */
export interface LegacySubmissionSchedule {
  isScheduled?: boolean;
  postAt?: number;
}

/**
 * Legacy submission entity from PostyBirb Plus.
 * Represents both regular submissions and file submissions.
 *
 * In legacy, SubmissionType is 'FILE' | 'NOTIFICATION'.
 * File submissions extend this with primary/thumbnail/fallback/additional file records.
 */
export class LegacySubmission {
  _id: string;

  created: number;

  lastUpdated: number;

  title: string;

  // Templates use 'alias' instead of 'title'
  alias?: string;

  type: string; // 'FILE' | 'NOTIFICATION'

  schedule: LegacySubmissionSchedule;

  sources: string[];

  order: number;

  isPosting?: boolean;

  isQueued?: boolean;

  // File submission fields (only present when type === 'FILE')
  primary?: LegacyFileRecord;

  thumbnail?: LegacyFileRecord;

  fallback?: LegacyFileRecord;

  additional?: LegacyFileRecord[];

  constructor(data: Partial<LegacySubmission>) {
    Object.assign(this, data);
  }
}
