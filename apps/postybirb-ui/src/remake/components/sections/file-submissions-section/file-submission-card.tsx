/**
 * FileSubmissionCard - Card component for displaying a file submission in the list.
 * Shows thumbnail, editable title, status badges, and action buttons.
 */

import { Trans } from '@lingui/react/macro';
import {
    ActionIcon,
    Badge,
    Box,
    Card,
    Group,
    Image,
    Menu,
    Stack,
    Text,
    TextInput,
    Tooltip,
} from '@mantine/core';
import {
    IconAlertTriangle,
    IconCalendar,
    IconCircleCheck,
    IconClock,
    IconCopy,
    IconDotsVertical,
    IconEdit,
    IconFile,
    IconGlobe,
    IconLoader,
    IconSend,
    IconTrash,
    IconX,
} from '@tabler/icons-react';
import moment from 'moment/min/moment-with-locales';
import { useCallback, useEffect, useState } from 'react';
import type { SubmissionRecord } from '../../../stores/records';
import { defaultTargetProvider } from '../../../transports/http-client';
import { HoldToConfirmButton } from '../../hold-to-confirm';

interface FileSubmissionCardProps {
  /** The submission record to display */
  submission: SubmissionRecord;
  /** Whether this card is selected */
  isSelected?: boolean;
  /** Handler for selecting this submission */
  onSelect?: (id: string, event: React.MouseEvent) => void;
  /** Handler for deleting this submission */
  onDelete?: (id: string) => void;
  /** Handler for duplicating this submission */
  onDuplicate?: (id: string) => void;
  /** Handler for editing this submission */
  onEdit?: (id: string) => void;
  /** Handler for updating the submission title */
  onTitleChange?: (id: string, title: string) => void;
  /** Handler for posting the submission */
  onPost?: (id: string) => void;
  /** Handler for scheduling the submission */
  onSchedule?: (id: string) => void;
}

/**
 * Get the thumbnail URL for a submission.
 * Returns undefined if no thumbnail is available.
 */
function getThumbnailUrl(submission: SubmissionRecord): string | undefined {
  const { primaryFile } = submission;
  if (!primaryFile) return undefined;

  const baseUrl = defaultTargetProvider();

  // Use the thumbnail if available
  if (primaryFile.hasThumbnail) {
    return `${baseUrl}/api/file/thumbnail/${primaryFile.id}`;
  }

  // Check if it's an image type that can be displayed directly
  if (primaryFile.mimeType?.startsWith('image/')) {
    return `${baseUrl}/api/file/file/${primaryFile.id}`;
  }

  return undefined;
}

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
}: FileSubmissionCardProps) {
  const thumbnailUrl = getThumbnailUrl(submission);
  const [localTitle, setLocalTitle] = useState(submission.title ?? '');
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  // Sync local title with submission title
  useEffect(() => {
    setLocalTitle(submission.title ?? '');
  }, [submission.title]);

  const handleClick = (event: React.MouseEvent) => {
    onSelect?.(submission.id, event);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(submission.id);
  };

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDuplicate?.(submission.id);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(submission.id);
  };

  const handleTitleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditingTitle(true);
  }, []);

  const handleTitleBlur = useCallback(() => {
    setIsEditingTitle(false);
    const trimmedTitle = localTitle.trim();
    if (trimmedTitle !== submission.title) {
      onTitleChange?.(submission.id, trimmedTitle);
    }
  }, [localTitle, submission.id, submission.title, onTitleChange]);

  const handleTitleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        (e.target as HTMLInputElement).blur();
      }
      if (e.key === 'Escape') {
        setLocalTitle(submission.title ?? '');
        setIsEditingTitle(false);
      }
    },
    [submission.title],
  );

  const handlePost = useCallback(() => {
    onPost?.(submission.id);
  }, [onPost, submission.id]);

  const handleSchedule = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onSchedule?.(submission.id);
    },
    [onSchedule, submission.id],
  );

  const canPost =
    !submission.hasErrors &&
    submission.hasWebsiteOptions &&
    !submission.isQueued;

  return (
    <Card
      p="xs"
      radius="0"
      withBorder
      onClick={handleClick}
      style={{
        cursor: 'pointer',
        backgroundColor: isSelected
          ? 'var(--mantine-color-primary-light)'
          : undefined,
        borderColor: isSelected
          ? 'var(--mantine-color-primary-filled)'
          : undefined,
      }}
    >
      <Group gap="sm" wrap="nowrap" align="flex-start">
        {/* Thumbnail */}
        <Box
          w={48}
          h={48}
          style={{
            flexShrink: 0,
            borderRadius: 'var(--mantine-radius-sm)',
            overflow: 'hidden',
            backgroundColor: 'var(--mantine-color-default)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {thumbnailUrl ? (
            <Image
              src={thumbnailUrl}
              alt={submission.name}
              w={48}
              h={48}
              fit="cover"
            />
          ) : (
            <IconFile size={24} stroke={1.5} opacity={0.5} />
          )}
        </Box>

        {/* Content */}
        <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
          {/* Editable Title */}
          {isEditingTitle ? (
            <TextInput
              size="xs"
              value={localTitle}
              onChange={(e) => setLocalTitle(e.currentTarget.value)}
              onBlur={handleTitleBlur}
              onKeyDown={handleTitleKeyDown}
              onClick={(e) => e.stopPropagation()}
              autoFocus
              styles={{
                input: {
                  fontWeight: 500,
                  // eslint-disable-next-line lingui/no-unlocalized-strings
                  padding: '2px 6px',
                  // eslint-disable-next-line lingui/no-unlocalized-strings
                  height: 'auto',
                  // eslint-disable-next-line lingui/no-unlocalized-strings
                  minHeight: 'unset',
                },
              }}
            />
          ) : (
            <Text
              size="sm"
              fw={500}
              lineClamp={1}
              onClick={handleTitleClick}
              style={{ cursor: 'text' }}
              title={submission.title || submission.name}
            >
              {submission.title || submission.name}
            </Text>
          )}

          {/* Status badges */}
          <Group gap={4}>
            {/* Scheduled badge */}
            {submission.isScheduled && (
              <Tooltip
                label={
                  submission.scheduledDate
                    ? submission.scheduledDate.toLocaleString()
                    : undefined
                }
              >
                <Badge
                  size="xs"
                  variant="light"
                  color="blue"
                  leftSection={<IconCalendar size={10} />}
                >
                  <Trans>Scheduled</Trans>
                </Badge>
              </Tooltip>
            )}

            {/* Queued badge */}
            {submission.isQueued && (
              <Badge
                size="xs"
                variant="light"
                color="cyan"
                leftSection={<IconLoader size={10} />}
              >
                <Trans>Queued</Trans>
              </Badge>
            )}

            {/* Validation errors */}
            {submission.hasErrors && (
              <Tooltip label={<Trans>Has validation errors</Trans>}>
                <Badge
                  size="xs"
                  variant="light"
                  color="red"
                  leftSection={<IconX size={10} />}
                >
                  <Trans>Errors</Trans>
                </Badge>
              </Tooltip>
            )}

            {/* Validation warnings */}
            {submission.hasWarnings && !submission.hasErrors && (
              <Tooltip label={<Trans>Has validation warnings</Trans>}>
                <Badge
                  size="xs"
                  variant="light"
                  color="yellow"
                  leftSection={<IconAlertTriangle size={10} />}
                >
                  <Trans>Warnings</Trans>
                </Badge>
              </Tooltip>
            )}

            {/* Valid badge (no errors/warnings) */}
            {!submission.hasErrors &&
              !submission.hasWarnings &&
              submission.hasWebsiteOptions && (
                <Tooltip label={<Trans>Ready to post</Trans>}>
                  <Badge
                    size="xs"
                    variant="light"
                    color="green"
                    leftSection={<IconCircleCheck size={10} />}
                  >
                    <Trans>Ready</Trans>
                  </Badge>
                </Tooltip>
              )}

            {/* No websites badge */}
            {!submission.hasWebsiteOptions && (
              <Tooltip label={<Trans>No websites selected</Trans>}>
                <Badge
                  size="xs"
                  variant="light"
                  color="gray"
                  leftSection={<IconGlobe size={10} />}
                >
                  <Trans>No websites</Trans>
                </Badge>
              </Tooltip>
            )}

            {/* Files count */}
            {submission.files.length > 1 && (
              <Badge size="xs" variant="outline" color="gray">
                {submission.files.length} <Trans>files</Trans>
              </Badge>
            )}
          </Group>

          {/* Last modified */}
          <Group gap={4}>
            <IconClock size={12} style={{ opacity: 0.5 }} />
            <Text size="xs" c="dimmed" title={submission.lastModified.toLocaleString()}>
              {moment(submission.lastModified).fromNow()}
            </Text>
          </Group>
        </Stack>

        {/* Action buttons */}
        <Group gap={4}>
          {/* Schedule button */}
          <Tooltip label={<Trans>Schedule</Trans>}>
            <ActionIcon
              variant="subtle"
              size="sm"
              color={submission.isScheduled ? 'blue' : 'gray'}
              onClick={handleSchedule}
              // eslint-disable-next-line lingui/no-unlocalized-strings
              aria-label="Schedule submission"
            >
              <IconCalendar size={16} />
            </ActionIcon>
          </Tooltip>

          {/* Post button (hold to confirm) */}
          <Tooltip label={<Trans>Hold to post</Trans>}>
            <HoldToConfirmButton
              onConfirm={handlePost}
              disabled={!canPost}
              variant="subtle"
              size="sm"
              color="green"
              // eslint-disable-next-line lingui/no-unlocalized-strings
              aria-label="Post submission"
            >
              <IconSend size={16} />
            </HoldToConfirmButton>
          </Tooltip>
        </Group>

        {/* Actions menu */}
        <Menu position="bottom-end" withinPortal>
          <Menu.Target>
            <ActionIcon
              variant="subtle"
              size="sm"
              onClick={(e) => e.stopPropagation()}
              // eslint-disable-next-line lingui/no-unlocalized-strings
              aria-label="Submission actions"
            >
              <IconDotsVertical size={16} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item
              leftSection={<IconEdit size={14} />}
              onClick={handleEdit}
            >
              <Trans>Edit</Trans>
            </Menu.Item>
            <Menu.Item
              leftSection={<IconCopy size={14} />}
              onClick={handleDuplicate}
            >
              <Trans>Duplicate</Trans>
            </Menu.Item>
            <Menu.Divider />
            <Menu.Item
              leftSection={<IconTrash size={14} />}
              color="red"
              onClick={handleDelete}
            >
              <Trans>Delete</Trans>
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>
    </Card>
  );
}
