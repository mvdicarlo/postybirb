/**
 * Hook that provides bound action handlers for a specific submission.
 * Eliminates the need to create wrapper callbacks in each SubmissionCard.
 */

import { ISubmissionScheduleInfo, IWebsiteFormFields } from '@postybirb/types';
import { useMemo } from 'react';
import { useSubmissionsContext } from '../context';

/**
 * Bound action handlers for a single submission.
 * Named 'BoundSubmissionActions' to avoid collision with the SubmissionActions component.
 */
export interface BoundSubmissionActions {
  /** Delete this submission */
  handleDelete: () => void;
  /** Duplicate this submission */
  handleDuplicate: () => void;
  /** Open this submission for editing */
  handleEdit: () => void;
  /** Post this submission immediately */
  handlePost: () => void;
  /** Update this submission's schedule */
  handleScheduleChange: (
    schedule: ISubmissionScheduleInfo,
    isScheduled: boolean
  ) => void;
  /** Update this submission's default option fields */
  handleDefaultOptionChange: (update: Partial<IWebsiteFormFields>) => void;
}

/**
 * Hook that returns action handlers bound to a specific submission ID.
 * Uses the SubmissionsContext internally, so must be used within a SubmissionsProvider.
 *
 * @param submissionId - The ID of the submission to bind actions to
 * @returns Object with bound action handlers
 *
 * @example
 * ```tsx
 * function MySubmissionCard({ submission }) {
 *   const actions = useSubmissionActions(submission.id);
 *   return (
 *     <button onClick={actions.handleDelete}>Delete</button>
 *   );
 * }
 * ```
 */
export function useSubmissionActions(submissionId: string): BoundSubmissionActions {
  const context = useSubmissionsContext();

  return useMemo<BoundSubmissionActions>(
    () => ({
      handleDelete: () => context.onDelete(submissionId),
      handleDuplicate: () => context.onDuplicate(submissionId),
      handleEdit: () => context.onEdit(submissionId),
      handlePost: () => context.onPost(submissionId),
      handleScheduleChange: (
        schedule: ISubmissionScheduleInfo,
        isScheduled: boolean
      ) => context.onScheduleChange(submissionId, schedule, isScheduled),
      handleDefaultOptionChange: (update: Partial<IWebsiteFormFields>) =>
        context.onDefaultOptionChange(submissionId, update),
    }),
    [context, submissionId]
  );
}
