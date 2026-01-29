/**
 * Shared types for SubmissionCard components.
 */

import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';
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
  /** Whether to show compact view (hides quick-edit actions and last modified) */
  isCompact?: boolean;
  /** Additional class name for the card */
  className?: string;
  /** dnd-kit drag handle listeners - passed from SortableSubmissionCard */
  dragHandleListeners?: SyntheticListenerMap;
}
