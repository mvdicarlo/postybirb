/**
 * SubmissionList - Renders the scrollable list of submissions.
 */

import { Trans } from '@lingui/react/macro';
import { Box, Loader, ScrollArea, Stack, Text } from '@mantine/core';
import { ISubmissionScheduleInfo, IWebsiteFormFields, SubmissionType } from '@postybirb/types';
import type { SubmissionRecord } from '../../../stores/records';
import { SubmissionCard } from './submission-card';
import './submissions-section.css';
import { DRAGGABLE_SUBMISSION_CLASS } from './types';

interface SubmissionListProps {
  /** Whether submissions are loading */
  isLoading: boolean;
  /** Ordered list of submissions to display */
  submissions: SubmissionRecord[];
  /** Type of submissions (FILE or MESSAGE) */
  submissionType: SubmissionType;
  /** Currently selected submission IDs */
  selectedIds: string[];
  /** Whether drag reordering is enabled */
  isDragEnabled: boolean;
  /** Ref for the sortable container */
  containerRef: React.RefObject<HTMLDivElement>;
  /** Handler for selecting a submission */
  onSelect: (id: string, event: React.MouseEvent) => void;
  /** Handler for deleting a submission */
  onDelete: (id: string) => void;
  /** Handler for duplicating a submission */
  onDuplicate: (id: string) => void;
  /** Handler for editing a submission */
  onEdit: (id: string) => void;
  /** Handler for changing a default option field (title, tags, rating, etc.) */
  onDefaultOptionChange: (
    id: string,
    update: Partial<IWebsiteFormFields>,
  ) => void;
  /** Handler for posting a submission */
  onPost: (id: string) => void;
  /** Handler for schedule changes */
  onScheduleChange: (
    id: string,
    schedule: ISubmissionScheduleInfo,
    isScheduled: boolean,
  ) => void;
}

/**
 * Scrollable list of submission cards.
 */
export function SubmissionList({
  isLoading,
  submissions,
  submissionType,
  selectedIds,
  isDragEnabled,
  containerRef,
  onSelect,
  onDelete,
  onDuplicate,
  onEdit,
  onDefaultOptionChange,
  onPost,
  onScheduleChange,
}: SubmissionListProps) {
  if (isLoading) {
    return (
      <Box className="postybirb__submission__list_loading">
        <Loader size="sm" />
      </Box>
    );
  }

  if (submissions.length === 0) {
    return (
      <Box className="postybirb__submission__list_empty">
        <Text size="sm" c="dimmed">
          <Trans>No submissions found</Trans>
        </Text>
      </Box>
    );
  }

  return (
    <ScrollArea
      className="postybirb__submission__list_scroll"
      type="hover"
      scrollbarSize={6}
    >
      <Stack gap="0" ref={containerRef}>
        {submissions.map((submission) => (
          <SubmissionCard
            key={submission.id}
            submission={submission}
            submissionType={submissionType}
            isSelected={selectedIds.includes(submission.id)}
            onSelect={onSelect}
            onDelete={onDelete}
            onDuplicate={onDuplicate}
            onEdit={onEdit}
            onDefaultOptionChange={onDefaultOptionChange}
            onPost={onPost}
            onScheduleChange={onScheduleChange}
            draggable={isDragEnabled}
            className={DRAGGABLE_SUBMISSION_CLASS}
          />
        ))}
      </Stack>
    </ScrollArea>
  );
}
