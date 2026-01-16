/**
 * SubmissionCard - Card component for displaying a submission in the list.
 * Shows thumbnail (for FILE type), editable title, status badges, and action buttons.
 * Uses SubmissionsContext for actions.
 */

import { Box, Card, Checkbox, Group, Stack, Text } from '@mantine/core';
import { PostRecordState, SubmissionType } from '@postybirb/types';
import { IconClock, IconGripVertical } from '@tabler/icons-react';
import { useCallback, useMemo } from 'react';
import { useLocale } from '../../../../hooks';
import { useSubmissionsContext } from '../context';
import { useSubmissionActions } from '../hooks';
import '../submissions-section.css';
import { SubmissionActions } from './submission-actions';
import { SubmissionBadges } from './submission-badges';
import { SubmissionQuickEditActions } from './submission-quick-edit-actions';
import { SubmissionThumbnail } from './submission-thumbnail';
import { SubmissionTitle } from './submission-title';
import type { SubmissionCardProps } from './types';
import { getThumbnailUrl } from './utils';

/**
 * Card component for displaying a submission in the section list.
 * Actions are provided via SubmissionsContext.
 */
export function SubmissionCard({
  submission,
  submissionType,
  isSelected = false,
  draggable = false,
  isCompact = false,
  className,
}: SubmissionCardProps) {
  const { onSelect } = useSubmissionsContext();
  const { formatRelativeTime, formatDateTime } = useLocale();
  const {
    handleDelete,
    handleDuplicate,
    handleEdit,
    handlePost,
    handleCancel,
    handleArchive,
    handleViewHistory,
    handleScheduleChange,
    handleDefaultOptionChange,
  } = useSubmissionActions(submission.id);

  const thumbnailUrl = getThumbnailUrl(submission);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onSelect(submission.id, event);
      } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const currentCard = event.currentTarget as HTMLElement;
        const cards = Array.from(
          currentCard
            .closest('.postybirb__submission__list')
            ?.querySelectorAll('.postybirb__submission__card') ?? [],
        ) as HTMLElement[];
        const currentIndex = cards.indexOf(currentCard);
        const nextIndex =
          event.key === 'ArrowDown' ? currentIndex + 1 : currentIndex - 1;
        if (nextIndex >= 0 && nextIndex < cards.length) {
          cards[nextIndex].focus();
        }
      }
    },
    [onSelect, submission.id],
  );

  const canPost =
    !submission.hasErrors &&
    submission.hasWebsiteOptions &&
    !submission.isQueued;

  // Check if the primary file is an image that can be previewed (only for FILE type)
  const canPreviewImage =
    submissionType === SubmissionType.FILE &&
    submission.primaryFile?.mimeType?.startsWith('image/');

  // Only show thumbnail for FILE type submissions
  const showThumbnail = submissionType === SubmissionType.FILE;

  // Check if the most recent post record failed
  const mostRecentPostHasErrors = useMemo(() => {
    if (submission.posts.length === 0) return false;
    // Get the most recent post record (last in the array or sort by date)
    const sortedPosts = [...submission.posts].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    const mostRecentPost = sortedPosts[0];
    // Check if the state is FAILED
    return mostRecentPost.state === PostRecordState.FAILED;
  }, [submission.posts]);

  // Build className list
  const cardClassName = useMemo(() => {
    const classes = ['postybirb__submission__card'];
    if (isSelected) classes.push('postybirb__submission__card--selected');
    if (submission.isScheduled)
      classes.push('postybirb__submission__card--scheduled');
    if (mostRecentPostHasErrors)
      classes.push('postybirb__submission__card--has-errors');
    if (isCompact) classes.push('postybirb__submission__card--compact');
    if (className) classes.push(className);
    return classes.join(' ');
  }, [
    isSelected,
    submission.isScheduled,
    mostRecentPostHasErrors,
    isCompact,
    className,
  ]);

  const handleCheckboxClick = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      onSelect(submission.id, event);
    },
    [onSelect, submission.id],
  );

  const cardContent = (
    <Card
      p="xs"
      radius="0"
      withBorder
      onClick={handleEdit}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="listitem"
      className={cardClassName}
      style={{ position: 'relative' }}
    >
      {/* Last modified - absolute position in upper right */}
      <Text
        size="xs"
        c="dimmed"
        title={formatDateTime(submission.lastModified)}
        style={{
          position: 'absolute',
          top: '1px',
          right: 'var(--mantine-spacing-xs)',
          opacity: submission.isScheduled ? 0.7 : 1,
        }}
      >
        {formatRelativeTime(submission.lastModified)}
      </Text>
      <Group gap="xs" wrap="nowrap" align="stretch">
        {/* Card actions column: checkbox + drag handle - full height */}
        <Stack
          gap="md"
          align="center"
          justify="center"
          className="postybirb__submission__card_actions_column"
        >
          <Checkbox
            size="xs"
            checked={isSelected}
            onChange={() => {}}
            onClick={handleCheckboxClick}
            // eslint-disable-next-line lingui/no-unlocalized-strings
            aria-label={`Select ${submission.title}`}
          />
          {draggable && (
            <Box
              className="sort-handle postybirb__submission__drag_handle"
              onClick={(e) => e.stopPropagation()}
            >
              <IconGripVertical size={16} />
            </Box>
          )}
        </Stack>

        {/* Card details column */}
        <Stack gap="xs" style={{ flex: 1, minWidth: 0 }}>
          <Group gap="xs" wrap="nowrap" align="center">
            {/* Thumbnail with optional HoverCard preview - only for FILE type */}
            {showThumbnail && (
              <SubmissionThumbnail
                thumbnailUrl={thumbnailUrl}
                alt={submission.title}
                canPreview={canPreviewImage}
                fileCount={submission.files.length}
              />
            )}

            {/* Content */}
            <Stack gap={4} className="postybirb__submission__card_content">
              {/* Editable Title */}
              <SubmissionTitle
                title={submission.title}
                name={submission.title}
                onTitleChange={(title) => handleDefaultOptionChange({ title })}
              />

              {/* Status badges */}
              <SubmissionBadges
                submission={submission}
                submissionType={submissionType}
              />

              {/* Scheduled date - prominent when active, dimmed when inactive */}
              {(submission.scheduledDate || submission.schedule.cron) && (
                <Group gap={4}>
                  <IconClock
                    size={12}
                    style={{
                      color: submission.isScheduled
                        ? 'var(--mantine-color-blue-6)'
                        : 'var(--mantine-color-dimmed)',
                    }}
                  />
                  <Text
                    size="xs"
                    c={submission.isScheduled ? 'blue.6' : 'dimmed'}
                    fw={submission.isScheduled ? '500' : undefined}
                  >
                    {submission.scheduledDate
                      ? formatDateTime(submission.scheduledDate)
                      : null}
                  </Text>
                </Group>
              )}
            </Stack>

            {/* Action buttons and menu */}
            <SubmissionActions
              canPost={canPost}
              schedule={submission.schedule}
              isScheduled={submission.isScheduled}
              isQueued={submission.isQueued}
              hasHistory={submission.posts.length > 0}
              onPost={handlePost}
              onCancel={handleCancel}
              onScheduleChange={handleScheduleChange}
              onEdit={handleEdit}
              onDuplicate={handleDuplicate}
              onViewHistory={handleViewHistory}
              onArchive={handleArchive}
              onDelete={handleDelete}
            />
          </Group>
          {/* Quick edit actions - hidden in compact mode */}
          {!isCompact && <SubmissionQuickEditActions submission={submission} />}
        </Stack>
      </Group>
    </Card>
  );

  return cardContent;
}
