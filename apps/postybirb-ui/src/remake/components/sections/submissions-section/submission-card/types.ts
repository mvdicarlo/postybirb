/**
 * Shared types for SubmissionCard components.
 */

import { IWebsiteFormFields, SubmissionType } from '@postybirb/types';
import type { SubmissionRecord } from '../../../../stores/records';

/**
 * Props for the SubmissionCard component.
 */
export interface SubmissionCardProps {
  /** The submission record to display */
  submission: SubmissionRecord;
  /** Type of submission (FILE or MESSAGE) */
  submissionType: SubmissionType;
  /** Whether this card is selected */
  isSelected?: boolean;
  /** Handler for selecting this submission */
  onSelect?: (id: string, event: React.MouseEvent) => void;
  /** Handler for deleting this submission */
  onDelete?: (id: string) => void;
  /** Handler for duplicating this submission */
  onDuplicate?: (id: string) => void;
  /** Handler for editing this submission */
  onEdit?: (id: string) => void;
  /** Handler for changing a default option field (title, tags, rating, etc.) */
  onDefaultOptionChange?: (
    id: string,
    update: Partial<IWebsiteFormFields>,
  ) => void;
  /** Handler for posting the submission */
  onPost?: (id: string) => void;
  /** Handler for scheduling the submission */
  onSchedule?: (id: string) => void;
  /** Whether this card is draggable for reordering */
  draggable?: boolean;
  /** Additional class name for the card */
  className?: string;
}
