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
    Tooltip,
} from '@mantine/core';
import { SubmissionType } from '@postybirb/types';
import {
    IconArchiveOff,
    IconDotsVertical,
    IconHistory,
    IconTrash
} from '@tabler/icons-react';
import { memo, useCallback, useMemo } from 'react';
import submissionApi from '../../../../api/submission.api';
import { useLocale } from '../../../../hooks';
import {
    showDeletedNotification,
    showDeleteErrorNotification,
    showRestoredNotification,
    showRestoreErrorNotification,
} from '../../../../utils/notifications';
import { useSubmissionsActions } from '../context';
import { SubmissionBadges } from './submission-badges';
import { SubmissionThumbnail } from './submission-thumbnail';
import { SubmissionTitle } from './submission-title';
import type { SubmissionCardProps } from './types';
import { getThumbnailUrl } from './utils';

interface ArchivedSubmissionCardProps extends Omit<
  SubmissionCardProps,
  'draggable'
> {
  /** Whether to show compact view (hides last modified) */
  isCompact?: boolean;
  /** Handler to open history drawer */
  onViewHistory?: () => void;
}

/**
 * Card component for archived submissions with limited actions.
 */
export const ArchivedSubmissionCard = memo(({
  submission,
  submissionType,
  isSelected = false,
  isCompact = false,
  className,
  onViewHistory,
}: ArchivedSubmissionCardProps) => {
  const { onSelect } = useSubmissionsActions();
  const { formatRelativeTime, formatDateTime } = useLocale();
  const thumbnailUrl = getThumbnailUrl(submission);

  // Check if the primary file is an image that can be previewed
  const canPreviewImage =
    submissionType === SubmissionType.FILE &&
    submission.primaryFile?.mimeType?.startsWith('image/');

  const showThumbnail = submissionType === SubmissionType.FILE;

  const cardClassName = useMemo(() => {
    const classes = ['postybirb__submission__card'];
    if (isSelected) classes.push('postybirb__submission__card--selected');
    if (isCompact) classes.push('postybirb__submission__card--compact');
    if (className) classes.push(className);
    return classes.join(' ');
  }, [isSelected, isCompact, className]);

  const handleClick = useCallback(
    (event: React.MouseEvent) => {
      onSelect(submission.id, event);
    },
    [onSelect, submission.id],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onSelect(submission.id, event);
      } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const currentCard = event.currentTarget as HTMLElement;
        const cards = Array.from(
          currentCard.closest('.postybirb__submission__list')?.querySelectorAll('.postybirb__submission__card') ?? []
        ) as HTMLElement[];
        const currentIndex = cards.indexOf(currentCard);
        const nextIndex = event.key === 'ArrowDown' ? currentIndex + 1 : currentIndex - 1;
        if (nextIndex >= 0 && nextIndex < cards.length) {
          cards[nextIndex].focus();
        }
      }
    },
    [onSelect, submission.id],
  );

  const handleUnarchive = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        await submissionApi.unarchive(submission.submissionId);
        showRestoredNotification();
      } catch {
        showRestoreErrorNotification();
      }
    },
    [submission.submissionId],
  );

  const handleDelete = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        await submissionApi.remove([submission.submissionId]);
        showDeletedNotification();
      } catch {
        showDeleteErrorNotification();
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
    <Card
      p="xs"
      radius="0"
      withBorder
      className={cardClassName}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
    >
      <Stack gap="xs">
        <Group gap="xs" wrap="nowrap" align="center">
          {/* Thumbnail - only for FILE type */}
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

            {/* Last modified - hidden in compact mode */}
            {!isCompact && (
              <Text
                size="xs"
                c="dimmed"
                title={formatDateTime(submission.lastModified)}
              >
                {formatRelativeTime(submission.lastModified)}
              </Text>
            )}
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
                  onKeyDown={(e) => e.stopPropagation()}
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
                onKeyDown={(e) => e.stopPropagation()}
              >
                <IconArchiveOff size={16} />
              </ActionIcon>
            </Tooltip>

            {/* Actions menu */}
            <Menu position="bottom-end" withinPortal trapFocus returnFocus>
              <Menu.Target>
                <ActionIcon
                  variant="subtle"
                  size="sm"
                  color="gray"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
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
});
