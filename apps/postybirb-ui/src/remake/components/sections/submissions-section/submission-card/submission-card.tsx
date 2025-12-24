/**
 * SubmissionCard - Card component for displaying a submission in the list.
 * Shows thumbnail (for FILE type), editable title, status badges, and action buttons.
 * Uses SubmissionsContext for actions.
 */

import { BorderAnimate } from '@gfazioli/mantine-border-animate';
import { Box, Card, Group, Stack, Text } from '@mantine/core';
import { SubmissionType } from '@postybirb/types';
import { IconClock, IconGripVertical } from '@tabler/icons-react';
import moment from 'moment/min/moment-with-locales';
import { useCallback, useMemo } from 'react';
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
  className,
}: SubmissionCardProps) {
  const { onSelect } = useSubmissionsContext();
  const {
    handleDelete,
    handleDuplicate,
    handleEdit,
    handlePost,
    handleArchive,
    handleViewHistory,
    handleScheduleChange,
    handleDefaultOptionChange,
  } = useSubmissionActions(submission.id);

  const thumbnailUrl = getThumbnailUrl(submission);

  const handleClick = useCallback(
    (event: React.MouseEvent) => {
      onSelect(submission.id, event);
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

  // Build className list
  const cardClassName = useMemo(() => {
    const classes = ['postybirb__submission__card'];
    if (isSelected) classes.push('postybirb__submission__card--selected');
    if (className) classes.push(className);
    return classes.join(' ');
  }, [isSelected, className]);

  const cardContent = (
    <Card
      p="xs"
      radius="0"
      withBorder
      onClick={handleClick}
      className={cardClassName}
    >
      <Stack gap="xs">
        <Group gap="xs" wrap="nowrap" align="center">
          {/* Drag handle */}
          {draggable && (
            <Box
              className="sort-handle postybirb__submission__drag_handle"
              onClick={(e) => e.stopPropagation()}
            >
              <IconGripVertical size={16} />
            </Box>
          )}

          {/* Thumbnail with optional HoverCard preview - only for FILE type */}
          {showThumbnail && (
            <SubmissionThumbnail
              thumbnailUrl={thumbnailUrl}
              alt={submission.title}
              canPreview={canPreviewImage}
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
                  fw={submission.isScheduled ? 500 : 400}
                >
                  {submission.scheduledDate?.toLocaleString()}
                </Text>
              </Group>
            )}

            {/* Last modified */}
            <Group gap={4}>
              <IconClock
                size={12}
                className="postybirb__submission__timestamp_icon"
                style={{
                  opacity: submission.isScheduled ? 0.5 : 1,
                }}
              />
              <Text
                size="xs"
                c="dimmed"
                style={{
                  opacity: submission.isScheduled ? 0.7 : 1,
                }}
                title={submission.lastModified.toLocaleString()}
              >
                {moment(submission.lastModified).fromNow()}
              </Text>
            </Group>
          </Stack>

          {/* Action buttons and menu */}
          <SubmissionActions
            canPost={canPost}
            schedule={submission.schedule}
            isScheduled={submission.isScheduled}
            hasHistory={submission.posts.length > 0}
            onPost={handlePost}
            onScheduleChange={handleScheduleChange}
            onEdit={handleEdit}
            onDuplicate={handleDuplicate}
            onViewHistory={handleViewHistory}
            onArchive={handleArchive}
            onDelete={handleDelete}
          />
        </Group>
        <Box ml={showThumbnail ? 'xl' : undefined}>
          <SubmissionQuickEditActions submission={submission} />
        </Box>
      </Stack>
    </Card>
  );

  // Wrap with animated border if scheduled
  if (submission.isScheduled) {
    return (
      <BorderAnimate
        variant="pulse"
        colorFrom="cyan"
        colorTo="blue"
        duration={3}
        size={100}
        blur={2}
        borderWidth={2}
        radius={0}
      >
        {cardContent}
      </BorderAnimate>
    );
  }

  return cardContent;
}
