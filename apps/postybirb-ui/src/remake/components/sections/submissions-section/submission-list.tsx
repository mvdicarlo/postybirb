/**
 * SubmissionList - Renders the scrollable list of submissions.
 * Uses SubmissionsContext for actions and state.
 */

import { Box, Loader, ScrollArea, Stack } from '@mantine/core';
import type { SubmissionRecord } from '../../../stores/records';
import { EmptyState } from '../../empty-state';
import { useSubmissionsContext } from './context';
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
    <ScrollArea
      className="postybirb__submission__list_scroll"
      type="hover"
      scrollbarSize={6}
    >
      <Stack gap="0" ref={containerRef} className="postybirb__submission__list">
        {submissions.map((submission) => (
          <SubmissionCard
            key={submission.id}
            submission={submission}
            submissionType={submissionType}
            isSelected={selectedIds.includes(submission.id)}
            draggable={isDragEnabled}
            className={DRAGGABLE_SUBMISSION_CLASS}
          />
        ))}
      </Stack>
    </ScrollArea>
  );
}
