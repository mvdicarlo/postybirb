/**
 * Shared types for SubmissionsSection components.
 */

import { SubmissionType } from '@postybirb/types';
import type { ViewState } from '../../../types/view-state';

/**
 * Props for the SubmissionsSection component.
 */
export interface SubmissionsSectionProps {
  /** Current view state */
  viewState: ViewState;
  /** Type of submissions to display (FILE or MESSAGE) */
  submissionType: SubmissionType;
}

/** Class name for draggable submission cards */
export const DRAGGABLE_SUBMISSION_CLASS = 'draggable-submission-card';
