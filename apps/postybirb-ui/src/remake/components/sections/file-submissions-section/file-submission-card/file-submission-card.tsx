/**
 * FileSubmissionCard - Card component for displaying a file submission in the list.
 * Shows thumbnail, editable title, status badges, and action buttons.
 */

import { Box, Card, Group, Stack, Text } from '@mantine/core';
import { IconClock, IconGripVertical } from '@tabler/icons-react';
import moment from 'moment/min/moment-with-locales';
import { useCallback } from 'react';
import { FileSubmissionActions } from './file-submission-actions';
import { FileSubmissionBadges } from './file-submission-badges';
import { FileSubmissionThumbnail } from './file-submission-thumbnail';
import { FileSubmissionTitle } from './file-submission-title';
import type { FileSubmissionCardProps } from './types';
import { getThumbnailUrl } from './utils';

/**
 * Card component for displaying a file submission in the section list.
 */
export function FileSubmissionCard({
  submission,
  isSelected = false,
  onSelect,
  onDelete,
  onDuplicate,
  onEdit,
  onTitleChange,
  onPost,
  onSchedule,
  draggable = false,
  className,
}: FileSubmissionCardProps) {
  const thumbnailUrl = getThumbnailUrl(submission);

  const handleClick = useCallback(
    (event: React.MouseEvent) => {
      onSelect?.(submission.id, event);
    },
    [onSelect, submission.id]
  );

  const handleTitleChange = useCallback(
    (title: string) => {
      onTitleChange?.(submission.id, title);
    },
    [onTitleChange, submission.id]
  );

  const handlePost = useCallback(() => {
    onPost?.(submission.id);
  }, [onPost, submission.id]);

  const handleSchedule = useCallback(() => {
    onSchedule?.(submission.id);
  }, [onSchedule, submission.id]);

  const handleEdit = useCallback(() => {
    onEdit?.(submission.id);
  }, [onEdit, submission.id]);

  const handleDuplicate = useCallback(() => {
    onDuplicate?.(submission.id);
  }, [onDuplicate, submission.id]);

  const handleDelete = useCallback(() => {
    onDelete?.(submission.id);
  }, [onDelete, submission.id]);

  const canPost =
    !submission.hasErrors &&
    submission.hasWebsiteOptions &&
    !submission.isQueued;

  // Check if the primary file is an image that can be previewed
  const canPreviewImage =
    submission.primaryFile?.mimeType?.startsWith('image/');

  return (
    <Card
      p="xs"
      radius="0"
      withBorder
      onClick={handleClick}
      className={className}
      style={{
        cursor: 'pointer',
        userSelect: 'none',
        backgroundColor: isSelected
          ? 'var(--mantine-color-primary-light)'
          : undefined,
        borderLeft: 'none',
        borderRight: 'none',
        borderTop: 'none',
        borderColor: isSelected
          ? 'var(--mantine-color-primary-filled)'
          : undefined,
      }}
    >
      <Group gap="xs" wrap="nowrap" align="center">
        {/* Drag handle */}
        {draggable && (
          <Box
            className="sort-handle"
            style={{
              cursor: 'grab',
              display: 'flex',
              alignItems: 'center',
              opacity: 0.5,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <IconGripVertical size={16} />
          </Box>
        )}

        {/* Thumbnail with optional HoverCard preview */}
        <FileSubmissionThumbnail
          thumbnailUrl={thumbnailUrl}
          alt={submission.name}
          canPreview={canPreviewImage}
        />

        {/* Content */}
        <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
          {/* Editable Title */}
          <FileSubmissionTitle
            title={submission.title}
            name={submission.name}
            onTitleChange={handleTitleChange}
          />

          {/* Status badges */}
          <FileSubmissionBadges submission={submission} />

          {/* Last modified */}
          <Group gap={4}>
            <IconClock size={12} style={{ opacity: 0.5 }} />
            <Text
              size="xs"
              c="dimmed"
              title={submission.lastModified.toLocaleString()}
            >
              {moment(submission.lastModified).fromNow()}
            </Text>
          </Group>
        </Stack>

        {/* Action buttons and menu */}
        <FileSubmissionActions
          canPost={canPost}
          hasScheduleTime={submission.hasScheduleTime}
          isScheduled={submission.isScheduled}
          onPost={handlePost}
          onSchedule={handleSchedule}
          onEdit={handleEdit}
          onDuplicate={handleDuplicate}
          onDelete={handleDelete}
        />
      </Group>
    </Card>
  );
}
