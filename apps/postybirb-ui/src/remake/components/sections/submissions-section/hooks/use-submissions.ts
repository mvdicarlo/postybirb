/**
 * Hook for filtering and ordering submissions by type.
 */

import { SubmissionType } from '@postybirb/types';
import { useEffect, useMemo, useState } from 'react';
import { useSubmissionsByType } from '../../../../stores/entity/submission-store';
import type { SubmissionRecord } from '../../../../stores/records';
import { useSubmissionsFilter } from '../../../../stores/ui/submissions-ui-store';

interface UseSubmissionsResult {
  /** All submissions of the given type (unfiltered) */
  allSubmissions: SubmissionRecord[];
  /** Filtered submissions based on search and filter */
  filteredSubmissions: SubmissionRecord[];
  /** Ordered submissions (for optimistic reordering) */
  orderedSubmissions: SubmissionRecord[];
  /** Update ordered submissions */
  setOrderedSubmissions: React.Dispatch<
    React.SetStateAction<SubmissionRecord[]>
  >;
  /** Current filter value */
  filter: string;
  /** Current search query */
  searchQuery: string;
  /** Whether drag is enabled (only when not filtering) */
  isDragEnabled: boolean;
}

interface UseSubmissionsProps {
  /** Type of submissions to filter (FILE or MESSAGE) */
  submissionType: SubmissionType;
}

/**
 * Hook for filtering, searching, and ordering submissions.
 */
export function useSubmissions({
  submissionType,
}: UseSubmissionsProps): UseSubmissionsResult {
  const allSubmissions = useSubmissionsByType(submissionType);
  const { filter, searchQuery } = useSubmissionsFilter(submissionType);

  // Filter submissions based on search query and filter
  const filteredSubmissions = useMemo(() => {
    let result = allSubmissions.filter(
      (s) => !s.isTemplate && !s.isMultiSubmission && !s.isArchived
    );

    // Sort by order
    result = result.sort((a, b) => a.order - b.order);

    // Apply status filter
    switch (filter) {
      case 'queued':
        result = result
          .filter((s) => s.isQueued)
          .sort((a, b) => {
            // Sort by postQueueRecord.createdAt ascending (oldest first = top of queue)
            const aCreatedAt = a.postQueueRecord?.createdAt ?? '';
            const bCreatedAt = b.postQueueRecord?.createdAt ?? '';
            return aCreatedAt.localeCompare(bCreatedAt);
          });
        break;
      case 'scheduled':
        result = result.filter((s) => s.isScheduled);
        break;
      case 'posted':
        result = result.filter((s) => s.isArchived);
        break;
      case 'failed':
        result = result.filter((s) => s.hasErrors);
        break;
      default:
        // 'all' - no additional filtering
        break;
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((s) => s.title.toLowerCase().includes(query));
    }

    return result;
  }, [allSubmissions, filter, searchQuery]);

  // Local ordered state for optimistic reordering
  const [orderedSubmissions, setOrderedSubmissions] =
    useState<SubmissionRecord[]>(filteredSubmissions);

  // Sync ordered submissions with filtered submissions
  useEffect(() => {
    setOrderedSubmissions(filteredSubmissions);
  }, [filteredSubmissions]);

  // Only enable drag when showing 'all' filter (no filtering applied)
  const isDragEnabled = filter === 'all' && !searchQuery;

  return {
    allSubmissions,
    filteredSubmissions,
    orderedSubmissions,
    setOrderedSubmissions,
    filter,
    searchQuery,
    isDragEnabled,
  };
}
