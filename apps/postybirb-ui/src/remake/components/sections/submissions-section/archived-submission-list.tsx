/**
 * ArchivedSubmissionList - Displays archived submissions with limited actions.
 * Shows cards with delete, unarchive, and view history options.
 */

import { ScrollArea, Stack } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { SubmissionType } from '@postybirb/types';
import { useMemo, useState } from 'react';
import { SubmissionRecord, useArchivedSubmissions } from '../../../stores';
import { useSubmissionsFilter } from '../../../stores/ui-store';
import { EmptyState } from '../../empty-state';
import { useSubmissionsContext } from './context';
import { ArchivedSubmissionCard } from './submission-card/archived-submission-card';
import { SubmissionHistoryDrawer } from './submission-history-drawer';
import './submissions-section.css';

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
  const { selectedIds } = useSubmissionsContext();
  const { searchQuery } = useSubmissionsFilter(submissionType);
  const [debouncedSearch] = useDebouncedValue(searchQuery, 300);
  const archivedSubmissions = useArchivedSubmissions();
  const [historySubmission, setHistorySubmission] =
    useState<SubmissionRecord | null>(null);

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

  const handleViewHistory = (submission: SubmissionRecord) => {
    setHistorySubmission(submission);
  };

  const handleCloseHistory = () => {
    setHistorySubmission(null);
  };

  if (filteredSubmissions.length === 0) {
    return <EmptyState preset="no-results" />;
  }

  return (
    <>
      <Stack gap="xs" h="100%">
        {/* Scrollable list */}
        <ScrollArea style={{ flex: 1 }}>
          <Stack gap="xs" className="postybirb__submission__list">
            {filteredSubmissions.map((submission) => (
              <ArchivedSubmissionCard
                key={submission.id}
                submission={submission}
                submissionType={submissionType}
                isSelected={selectedIds.includes(submission.id)}
                onViewHistory={() => handleViewHistory(submission)}
              />
            ))}
          </Stack>
        </ScrollArea>
      </Stack>

      {/* History drawer */}
      <SubmissionHistoryDrawer
        opened={historySubmission !== null}
        onClose={handleCloseHistory}
        submission={historySubmission}
      />
    </>
  );
}
