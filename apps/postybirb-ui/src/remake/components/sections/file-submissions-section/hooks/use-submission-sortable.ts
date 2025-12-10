/**
 * Hook for managing sortable drag-and-drop for submissions.
 */

import { useEffect, useRef } from 'react';
import Sortable from 'sortablejs';
import { draggableIndexesAreDefined } from '../../../../../helpers/sortable.helper';
import submissionApi from '../../../../api/submission.api';
import type { SubmissionRecord } from '../../../../stores/records';
import { DRAGGABLE_SUBMISSION_CLASS } from '../types';

interface UseSubmissionSortableProps {
  /** Whether drag is enabled */
  isDragEnabled: boolean;
  /** Current ordered submissions */
  orderedSubmissions: SubmissionRecord[];
  /** Callback to update ordered submissions */
  setOrderedSubmissions: React.Dispatch<
    React.SetStateAction<SubmissionRecord[]>
  >;
}

interface UseSubmissionSortableResult {
  /** Ref to attach to the sortable container */
  containerRef: React.RefObject<HTMLDivElement>;
}

/**
 * Hook for managing sortable drag-and-drop functionality.
 */
export function useSubmissionSortable({
  isDragEnabled,
  orderedSubmissions,
  setOrderedSubmissions,
}: UseSubmissionSortableProps): UseSubmissionSortableResult {
  const containerRef = useRef<HTMLDivElement>(null);
  const sortableRef = useRef<Sortable | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isDragEnabled) {
      // Destroy existing sortable if drag is disabled
      if (sortableRef.current) {
        sortableRef.current.destroy();
        sortableRef.current = null;
      }
      return undefined;
    }

    sortableRef.current = new Sortable(container, {
      draggable: `.${DRAGGABLE_SUBMISSION_CLASS}`,
      handle: '.sort-handle',
      animation: 150,
      ghostClass: 'submission-drag-ghost',
      chosenClass: 'submission-drag-chosen',
      onEnd: (event) => {
        if (draggableIndexesAreDefined(event)) {
          const newOrdered = [...orderedSubmissions];
          const [movedSubmission] = newOrdered.splice(
            event.oldDraggableIndex,
            1
          );
          newOrdered.splice(event.newDraggableIndex, 0, movedSubmission);
          setOrderedSubmissions(newOrdered);
          submissionApi.reorder(movedSubmission.id, event.newDraggableIndex);
        }
      },
    });

    return () => {
      if (sortableRef.current) {
        try {
          sortableRef.current.destroy();
        } catch {
          // Ignore destroy errors
        }
        sortableRef.current = null;
      }
    };
  }, [isDragEnabled, orderedSubmissions, setOrderedSubmissions]);

  return {
    containerRef,
  };
}
