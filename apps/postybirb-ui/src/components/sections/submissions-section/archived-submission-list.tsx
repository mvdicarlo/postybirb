/**
 * ArchivedSubmissionList - Displays archived submissions with limited actions.
 * Shows cards with delete, unarchive, and view history options.
 */

import { ScrollArea, Stack } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { SubmissionType } from '@postybirb/types';
import { useMemo } from 'react';
import { useArchivedSubmissions } from '../../../stores';
import { useIsCompactView } from '../../../stores/ui/appearance-store';
import { useSubmissionHistoryDrawerStore } from '../../../stores/ui/submission-history-drawer-store';
import { useSubmissionsFilter } from '../../../stores/ui/submissions-ui-store';
import { EmptyState } from '../../empty-state';
import { useSubmissionsData } from './context';
import { ArchivedSubmissionCard } from './submission-card/archived-submission-card';

interface ArchivedSubmissionListProps {
  /** Type of submissions to display */
  submissionType: SubmissionType;
}

/**
 * List of archived submissions with history drawer.
 */
export function ArchivedSubmissionList({
  submissionType,
}: ArchivedSubmissionListProps) {
  const { selectedIds } = useSubmissionsData();
  const { searchQuery } = useSubmissionsFilter(submissionType);
  const [debouncedSearch] = useDebouncedValue(searchQuery, 300);
  const archivedSubmissions = useArchivedSubmissions();
  const isCompact = useIsCompactView();

  // Filter by type, search query, and sort by last modified (most recent first)
  const filteredSubmissions = useMemo(() => {
    let results = archivedSubmissions.filter(
      (sub) => sub.type === submissionType,
    );

    if (debouncedSearch.trim()) {
      const search = debouncedSearch.toLowerCase();
      results = results.filter((sub) =>
        sub.title.toLowerCase().includes(search),
      );
    }

    return results.sort(
      (a, b) => b.lastModified.getTime() - a.lastModified.getTime(),
    );
  }, [archivedSubmissions, submissionType, debouncedSearch]);

  const handleViewHistory = (submission: { id: string }) => {
    useSubmissionHistoryDrawerStore.getState().open(submission.id);
  };

  if (filteredSubmissions.length === 0) {
    return <EmptyState preset="no-results" />;
  }

  return (
    <Stack gap="xs" h="100%">
      {/* Scrollable list */}
      <ScrollArea style={{ flex: 1 }}>
        <Stack gap={0} className="postybirb__submission__list">
          {filteredSubmissions.map((submission) => (
            <ArchivedSubmissionCard
              key={submission.id}
              submission={submission}
              submissionType={submissionType}
              isSelected={selectedIds.includes(submission.id)}
              isCompact={isCompact}
              onViewHistory={() => handleViewHistory(submission)}
            />
          ))}
        </Stack>
      </ScrollArea>
    </Stack>
  );
}
