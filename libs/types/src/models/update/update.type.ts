/**
 * Information about a specific release note.
 */
export interface ReleaseNoteInfo {
  /**
   * The version number for this release.
   */
  readonly version: string;
  /**
   * The release note content (HTML formatted).
   */
  readonly note: string | null;
}

/**
 * The current state of the application update process.
 */
export interface UpdateState {
  /**
   * Whether an update is available for download.
   */
  updateAvailable?: boolean;
  /**
   * Whether the update has been downloaded and is ready to install.
   */
  updateDownloaded?: boolean;
  /**
   * Whether an update is currently being downloaded.
   */
  updateDownloading?: boolean;
  /**
   * Error message if the update process failed.
   */
  updateError?: string;
  /**
   * Download progress percentage (0-100).
   */
  updateProgress?: number;
  /**
   * Release notes for available updates.
   */
  updateNotes?: ReleaseNoteInfo[];
}
