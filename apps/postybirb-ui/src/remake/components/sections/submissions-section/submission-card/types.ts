/**
 * Shared types for SubmissionCard components.
 */

import { SubmissionType } from '@postybirb/types';
import type { SubmissionRecord } from '../../../../stores/records';

/**
 * Props for the SubmissionCard component.
 * Actions are obtained from SubmissionsContext via useSubmissionActions hook.
 */
export interface SubmissionCardProps {
  /** The submission record to display */
  submission: SubmissionRecord;
  /** Type of submission (FILE or MESSAGE) */
  submissionType: SubmissionType;
  /** Whether this card is selected */
  isSelected?: boolean;
  /** Whether this card is draggable for reordering */
  draggable?: boolean;
  /** Additional class name for the card */
  className?: string;
}
