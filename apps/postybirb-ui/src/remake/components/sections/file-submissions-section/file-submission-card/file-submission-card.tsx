/**
 * FileSubmissionCard - Card component for displaying a file submission in the list.
 * Shows thumbnail, editable title, status badges, and action buttons.
 */

import { Box, Card, Group, Stack, Text } from '@mantine/core';
import { IWebsiteFormFields } from '@postybirb/types';
import { IconClock, IconGripVertical } from '@tabler/icons-react';
import clsx from 'clsx';
import moment from 'moment/min/moment-with-locales';
import { useCallback } from 'react';
import '../file-submissions-section.css';
import { FileSubmissionActions } from './file-submission-actions';
import { FileSubmissionBadges } from './file-submission-badges';
import { FileSubmissionQuickEditActions } from './file-submission-quick-edit-actions';
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
  onDefaultOptionChange,
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
    [onSelect, submission.id],
  );

  const handleDefaultOptionChange = useCallback(
    (update: Partial<IWebsiteFormFields>) => {
      onDefaultOptionChange?.(submission.id, update);
    },
    [onDefaultOptionChange, submission.id],
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
      className={clsx(
        'postybirb__file_submission__card',
        isSelected && 'postybirb__file_submission__card--selected',
        className,
      )}
    >
      <Stack gap="xs">
        <Group gap="xs" wrap="nowrap" align="center">
          {/* Drag handle */}
          {draggable && (
            <Box
              className="sort-handle postybirb__file_submission__drag_handle"
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
          <Stack gap={4} className="postybirb__file_submission__card_content">
            {/* Editable Title */}
            <FileSubmissionTitle
              title={submission.title}
              name={submission.name}
              onTitleChange={(title) =>
                handleDefaultOptionChange({ title })
              }
            />

            {/* Status badges */}
            <FileSubmissionBadges submission={submission} />

            {/* Last modified */}
            <Group gap={4}>
              <IconClock
                size={12}
                className="postybirb__file_submission__timestamp_icon"
              />
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
        <Box ml="xl">
          <FileSubmissionQuickEditActions
            submission={submission}
            onDefaultOptionChange={handleDefaultOptionChange}
          />
        </Box>
      </Stack>
    </Card>
  );
}
