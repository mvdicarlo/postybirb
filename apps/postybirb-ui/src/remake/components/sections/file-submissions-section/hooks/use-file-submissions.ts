/**
 * Hook for filtering and ordering file submissions.
 */

import { SubmissionType } from '@postybirb/types';
import { useEffect, useMemo, useState } from 'react';
import type { SubmissionRecord } from '../../../../stores/records';
import { useSubmissionsByType } from '../../../../stores/submission-store';
import { useFileSubmissionsFilter } from '../../../../stores/submissions-ui-store';

interface UseFileSubmissionsResult {
  /** All file submissions (unfiltered) */
  allSubmissions: SubmissionRecord[];
  /** Filtered submissions based on search and filter */
  filteredSubmissions: SubmissionRecord[];
  /** Ordered submissions (for optimistic reordering) */
  orderedSubmissions: SubmissionRecord[];
  /** Update ordered submissions */
  setOrderedSubmissions: React.Dispatch<React.SetStateAction<SubmissionRecord[]>>;
  /** Current filter value */
  filter: string;
  /** Current search query */
  searchQuery: string;
  /** Whether drag is enabled (only when not filtering) */
  isDragEnabled: boolean;
}

/**
 * Hook for filtering, searching, and ordering file submissions.
 */
export function useFileSubmissions(): UseFileSubmissionsResult {
  const allSubmissions = useSubmissionsByType(SubmissionType.FILE);
  const { filter, searchQuery } = useFileSubmissionsFilter();

  // Filter submissions based on search query and filter
  const filteredSubmissions = useMemo(() => {
    let result = allSubmissions.filter(
      (s) => !s.isTemplate && !s.isMultiSubmission && !s.isArchived
    );

    // Sort by order
    result = result.sort((a, b) => a.order - b.order);

    // Apply status filter
    switch (filter) {
      case 'drafts':
        result = result.filter((s) => !s.isScheduled && !s.isQueued);
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
