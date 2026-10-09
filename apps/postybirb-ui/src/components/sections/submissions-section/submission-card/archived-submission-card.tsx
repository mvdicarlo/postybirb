/**
 * ArchivedSubmissionCard - Card for archived submissions with limited actions.
 * Only allows viewing, unarchiving, viewing history, and deleting.
 */

import { Trans } from '@lingui/react/macro';
import {
  ActionIcon,
  Button,
  Card,
  Checkbox,
  Group,
  Stack,
  Tooltip,
} from '@mantine/core';
import { SubmissionType } from '@postybirb/types';
import { IconArchiveOff, IconHistory, IconTrash } from '@tabler/icons-react';
import { memo, useCallback, useMemo } from 'react';
import submissionApi from '../../../../api/submission.api';
import {
  showDeletedNotification,
  showDeleteErrorNotification,
  showRestoredNotification,
  showRestoreErrorNotification,
} from '../../../../utils/notifications';
import { HoldToConfirmButton } from '../../../hold-to-confirm';
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

  const handleCheckboxChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const nativeEvent = event.nativeEvent as MouseEvent;
      onSelect(
        submission.id,
        {
          shiftKey: nativeEvent.shiftKey,
          ctrlKey: nativeEvent.ctrlKey,
          metaKey: nativeEvent.metaKey,
        } as React.MouseEvent,
        true, // isCheckbox - enables toggle behavior
      );
    },
    [onSelect, submission.id],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.target !== event.currentTarget) return;

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

  const handleDelete = useCallback(async () => {
    try {
      await submissionApi.remove([submission.submissionId]);
      showDeletedNotification();
    } catch {
      showDeleteErrorNotification();
    }
  }, [submission.submissionId]);

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
      role="listitem"
    >
      <Group
        gap="xs"
        wrap="nowrap"
        align="flex-start"
        className="postybirb__submission__card_layout"
      >
          {/* Selection checkbox */}
          <Stack
            gap={4}
            align="center"
            justify="center"
            style={{ alignSelf: 'stretch' }}
            className="postybirb__submission__card_actions_column"
          >
            <Checkbox
              size="xs"
              checked={isSelected}
              onChange={handleCheckboxChange}
              onClick={(e) => e.stopPropagation()}
              // eslint-disable-next-line lingui/no-unlocalized-strings
              aria-label={`Select ${submission.title}`}
            />
          </Stack>

          {/* Thumbnail - only for FILE type */}
          {showThumbnail && (
            <SubmissionThumbnail
              thumbnailUrl={thumbnailUrl}
              alt={submission.title}
              canPreview={canPreviewImage}
              fileCount={submission.files.length}
            />
          )}

        <Stack gap={4} className="postybirb__submission__card_content">
          <SubmissionTitle
            title={submission.title}
            name={submission.title}
            readOnly
          />
          <SubmissionBadges
            submission={submission}
          />
        </Stack>

        <Group
          gap={4}
          wrap="nowrap"
          align="center"
          className="postybirb__submission__card_actions"
        >
          <Button
            variant="subtle"
            size="compact-sm"
            color="blue"
            leftSection={<IconArchiveOff size={14} />}
            onClick={handleUnarchive}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <Trans>Restore</Trans>
          </Button>

          <Tooltip label={<Trans>View history</Trans>}>
            <ActionIcon
              variant="subtle"
              size="sm"
              color="gray"
              onClick={handleViewHistory}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <IconHistory size={16} />
            </ActionIcon>
          </Tooltip>

          <Tooltip label={<Trans>Hold to delete permanently</Trans>}>
            <HoldToConfirmButton
              onConfirm={handleDelete}
              variant="subtle"
              size="sm"
              color="red"
              onClick={(e) => e.stopPropagation()}
              // eslint-disable-next-line lingui/no-unlocalized-strings
              aria-label="Delete permanently"
            >
              <IconTrash size={16} />
            </HoldToConfirmButton>
          </Tooltip>
        </Group>
      </Group>
    </Card>
  );
});
