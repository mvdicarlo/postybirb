/**
 * Shared types for FileSubmissionsSection components.
 */

import type { ViewState } from '../../../types/view-state';

/**
 * Props for the FileSubmissionsSection component.
 */
export interface FileSubmissionsSectionProps {
  /** Current view state */
  viewState: ViewState;
}

/** Class name for draggable submission cards */
export const DRAGGABLE_SUBMISSION_CLASS = 'draggable-submission-card';
