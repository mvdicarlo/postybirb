/**
 * ArchivedSubmissionCard - Card for archived submissions with limited actions.
 * Only allows viewing, unarchiving, viewing history, and deleting.
 */

import { Trans } from '@lingui/react/macro';
import {
    ActionIcon,
    Card,
    Group,
    Menu,
    Stack,
    Text,
    Tooltip
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { SubmissionType } from '@postybirb/types';
import {
    IconArchiveOff,
    IconDotsVertical,
    IconHistory,
    IconTrash,
} from '@tabler/icons-react';
import moment from 'moment/min/moment-with-locales';
import { useCallback, useMemo } from 'react';
import submissionApi from '../../../../api/submission.api';
import { useSubmissionsContext } from '../context';
import { SubmissionBadges } from './submission-badges';
import { SubmissionThumbnail } from './submission-thumbnail';
import { SubmissionTitle } from './submission-title';
import type { SubmissionCardProps } from './types';
import { getThumbnailUrl } from './utils';

interface ArchivedSubmissionCardProps extends Omit<SubmissionCardProps, 'draggable'> {
  /** Handler to open history drawer */
  onViewHistory?: () => void;
}

/**
 * Card component for archived submissions with limited actions.
 */
export function ArchivedSubmissionCard({
  submission,
  submissionType,
  isSelected = false,
  className,
  onViewHistory,
}: ArchivedSubmissionCardProps) {
  const { onSelect } = useSubmissionsContext();
  const thumbnailUrl = getThumbnailUrl(submission);

  // Check if the primary file is an image that can be previewed
  const canPreviewImage =
    submissionType === SubmissionType.FILE &&
    submission.primaryFile?.mimeType?.startsWith('image/');

  const showThumbnail = submissionType === SubmissionType.FILE;

  const cardClassName = useMemo(() => {
    const classes = ['postybirb__submission__card'];
    if (isSelected) classes.push('postybirb__submission__card--selected');
    if (className) classes.push(className);
    return classes.join(' ');
  }, [isSelected, className]);

  const handleClick = useCallback(
    (event: React.MouseEvent) => {
      onSelect(submission.id, event);
    },
    [onSelect, submission.id],
  );

  const handleUnarchive = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        await submissionApi.unarchive(submission.submissionId);
        notifications.show({
          message: <Trans>Submission restored</Trans>,
          color: 'green',
        });
      } catch (error) {
        notifications.show({
          message: <Trans>Failed to restore submission</Trans>,
          color: 'red',
        });
      }
    },
    [submission.submissionId],
  );

  const handleDelete = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        await submissionApi.remove([submission.submissionId]);
        notifications.show({
          message: <Trans>Submission deleted</Trans>,
          color: 'green',
        });
      } catch (error) {
        notifications.show({
          message: <Trans>Failed to delete submission</Trans>,
          color: 'red',
        });
      }
    },
    [submission.submissionId],
  );

  const handleViewHistory = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onViewHistory?.();
    },
    [onViewHistory],
  );

  return (
    <Card p="xs" radius="0" withBorder className={cardClassName} onClick={handleClick}>
      <Stack gap="xs">
        <Group gap="xs" wrap="nowrap" align="center">
          {/* Thumbnail - only for FILE type */}
          {showThumbnail && (
            <SubmissionThumbnail
              thumbnailUrl={thumbnailUrl}
              alt={submission.title}
              canPreview={canPreviewImage}
            />
          )}

          {/* Content */}
          <Stack gap={4} className="postybirb__submission__card_content">
            {/* Title (read-only for archived) */}
            <SubmissionTitle
              title={submission.title}
              name={submission.title}
              readOnly
            />

            {/* Status badges */}
            <SubmissionBadges
              submission={submission}
              submissionType={submissionType}
            />

            {/* Post count */}
            {submission.posts.length > 0 && (
              <Text size="xs" c="dimmed">
                <Trans>Posted {submission.posts.length} time(s)</Trans>
              </Text>
            )}

            {/* Last modified */}
            <Text
              size="xs"
              c="dimmed"
              title={submission.lastModified.toLocaleString()}
            >
              {moment(submission.lastModified).fromNow()}
            </Text>
          </Stack>

          {/* Action buttons */}
          <Group gap={4}>
            {/* View history button */}
            {submission.posts.length > 0 && (
              <Tooltip label={<Trans>View history</Trans>}>
                <ActionIcon
                  variant="subtle"
                  size="sm"
                  onClick={handleViewHistory}
                >
                  <IconHistory size={16} />
                </ActionIcon>
              </Tooltip>
            )}

            {/* Unarchive button */}
            <Tooltip label={<Trans>Restore</Trans>}>
              <ActionIcon
                variant="subtle"
                size="sm"
                color="blue"
                onClick={handleUnarchive}
              >
                <IconArchiveOff size={16} />
              </ActionIcon>
            </Tooltip>

            {/* Actions menu */}
            <Menu position="bottom-end" withinPortal>
              <Menu.Target>
                <ActionIcon
                  variant="subtle"
                  size="sm"
                  color="gray"
                  onClick={(e) => e.stopPropagation()}
                >
                  <IconDotsVertical size={16} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                {submission.posts.length > 0 && (
                  <Menu.Item
                    leftSection={<IconHistory size={14} />}
                    onClick={handleViewHistory}
                  >
                    <Trans>View history</Trans>
                  </Menu.Item>
                )}
                <Menu.Item
                  leftSection={<IconArchiveOff size={14} />}
                  onClick={handleUnarchive}
                >
                  <Trans>Restore</Trans>
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                  leftSection={<IconTrash size={14} />}
                  color="red"
                  onClick={handleDelete}
                >
                  <Trans>Delete permanently</Trans>
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </Stack>
    </Card>
  );
}
