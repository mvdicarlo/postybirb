/**
 * Shared types for SubmissionsSection components.
 */

import { SubmissionType } from '@postybirb/types';
import type {
    FileSubmissionsViewState,
    MessageSubmissionsViewState,
    ViewState,
} from '../../../types/view-state';
import {
    isFileSubmissionsViewState,
    isMessageSubmissionsViewState,
} from '../../../types/view-state';

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

// ============================================================================
// View State Type Guards
// ============================================================================

/**
 * Union type for submissions view states (file or message)
 */
export type SubmissionsViewState =
  | FileSubmissionsViewState
  | MessageSubmissionsViewState;

/**
 * Type guard to check if a view state is a submissions view state.
 * Use this to narrow ViewState to SubmissionsViewState.
 */
export function isSubmissionsViewState(
  viewState: ViewState
): viewState is SubmissionsViewState {
  return (
    isFileSubmissionsViewState(viewState) ||
    isMessageSubmissionsViewState(viewState)
  );
}

// ============================================================================
// Filter Constants
// ============================================================================

/**
 * Submission filter values as constants.
 * Use these instead of magic strings for type safety.
 */
export const SUBMISSION_FILTERS = {
  ALL: 'all',
  DRAFTS: 'drafts',
  SCHEDULED: 'scheduled',
  POSTED: 'posted',
  FAILED: 'failed',
} as const;

/**
 * Type for submission filter values
 */
export type SubmissionFilterValue =
  (typeof SUBMISSION_FILTERS)[keyof typeof SUBMISSION_FILTERS];
