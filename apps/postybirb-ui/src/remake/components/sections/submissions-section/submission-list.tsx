/**
 * SubmissionList - Renders the scrollable list of submissions.
 * Uses SubmissionsContext for actions and state.
 * Provides scroll container context for thumbnail lazy-loading.
 */

import { Box, Loader, ScrollArea, Stack } from '@mantine/core';
import { useRef } from 'react';
import type { SubmissionRecord } from '../../../stores/records';
import { useIsCompactView } from '../../../stores/ui/appearance-store';
import { EmptyState } from '../../empty-state';
import { ScrollContainerProvider, useSubmissionsContext } from './context';
import { SubmissionCard } from './submission-card';
import './submissions-section.css';
import { DRAGGABLE_SUBMISSION_CLASS } from './types';

interface SubmissionListProps {
  /** Whether submissions are loading */
  isLoading: boolean;
  /** Ordered list of submissions to display */
  submissions: SubmissionRecord[];
  /** Ref for the sortable container */
  containerRef: React.RefObject<HTMLDivElement>;
}

/**
 * Scrollable list of submission cards.
 * Actions and selection are provided via SubmissionsContext.
 */
export function SubmissionList({
  isLoading,
  submissions,
  containerRef,
}: SubmissionListProps) {
  const { submissionType, selectedIds, isDragEnabled } = useSubmissionsContext();
  const isCompact = useIsCompactView();
  // Ref for ScrollArea viewport - used for IntersectionObserver root in thumbnails
  const scrollViewportRef = useRef<HTMLDivElement>(null);

  if (isLoading) {
    return (
      <Box className="postybirb__submission__list_loading">
        <Loader size="sm" />
      </Box>
    );
  }

  if (submissions.length === 0) {
    return <EmptyState preset="no-results" />;
  }

  return (
    <ScrollContainerProvider scrollContainerRef={scrollViewportRef}>
      <ScrollArea
        className="postybirb__submission__list_scroll"
        type="hover"
        scrollbarSize={6}
        viewportRef={scrollViewportRef}
      >
        <Stack gap="0" ref={containerRef} className="postybirb__submission__list">
          {submissions.map((submission) => (
            <SubmissionCard
              key={submission.id}
              submission={submission}
              submissionType={submissionType}
              isSelected={selectedIds.includes(submission.id)}
              draggable={isDragEnabled}
              isCompact={isCompact}
              className={DRAGGABLE_SUBMISSION_CLASS}
            />
          ))}
        </Stack>
      </ScrollArea>
    </ScrollContainerProvider>
  );
}
