/**
 * ArchivedSubmissionList - Displays archived submissions with limited actions.
 * Shows cards with delete, unarchive, and view history options.
 */

import { ScrollArea, Stack } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { SubmissionType } from '@postybirb/types';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useCallback, useMemo, useRef } from 'react';
import { useArchivedSubmissions } from '../../../stores';
import { useIsCompactView } from '../../../stores/ui/appearance-store';
import { useSubmissionHistoryDrawerStore } from '../../../stores/ui/submission-history-drawer-store';
import { useSubmissionsFilter } from '../../../stores/ui/submissions-ui-store';
import { EmptyState } from '../../empty-state';
import { useSubmissionsData } from './context';
import { ArchivedSubmissionCard } from './submission-card/archived-submission-card';
import {
    ARCHIVED_SUBMISSION_CARD_HEIGHT,
    COMPACT_SUBMISSION_CARD_HEIGHT,
} from './types';

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
  const viewportRef = useRef<HTMLDivElement>(null);

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
  const getItemKey = useCallback(
    (index: number) => filteredSubmissions[index].id,
    [filteredSubmissions],
  );
  const virtualizer = useVirtualizer({
    count: filteredSubmissions.length,
    getScrollElement: () => viewportRef.current,
    getItemKey,
    estimateSize: () =>
      isCompact
        ? COMPACT_SUBMISSION_CARD_HEIGHT
        : ARCHIVED_SUBMISSION_CARD_HEIGHT,
    overscan: 5,
  });

  const handleViewHistory = (submission: { id: string }) => {
    useSubmissionHistoryDrawerStore.getState().open(submission.id);
  };

  if (filteredSubmissions.length === 0) {
    return <EmptyState preset="no-results" />;
  }

  return (
    <Stack gap="xs" h="100%">
      {/* Scrollable list */}
      <ScrollArea viewportRef={viewportRef} style={{ flex: 1 }}>
        <div
          className="postybirb__submission__list"
          role="list"
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            position: 'relative',
            width: '100%',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const submission = filteredSubmissions[virtualRow.index];
            return (
              <div
                key={virtualRow.key}
                style={{
                  left: 0,
                  position: 'absolute',
                  top: 0,
                  transform: `translateY(${virtualRow.start}px)`,
                  width: '100%',
                }}
              >
                <ArchivedSubmissionCard
                  submission={submission}
                  submissionType={submissionType}
                  isSelected={selectedIds.includes(submission.id)}
                  isCompact={isCompact}
                  onViewHistory={() => handleViewHistory(submission)}
                />
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </Stack>
  );
}
