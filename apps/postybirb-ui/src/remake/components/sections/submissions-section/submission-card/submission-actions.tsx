/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
/**
 * SubmissionActions - Action buttons and menu for submissions.
 */

import { Trans } from '@lingui/react/macro';
import { ActionIcon, Group, Menu, Tooltip } from '@mantine/core';
import { ISubmissionScheduleInfo } from '@postybirb/types';
import {
  IconArchive,
  IconCancel,
  IconCopy,
  IconDotsVertical,
  IconEdit,
  IconHistory,
  IconSend,
  IconTrash,
} from '@tabler/icons-react';
import { useCallback } from 'react';
import { HoldToConfirmButton } from '../../../hold-to-confirm';
import { SchedulePopover } from '../../../shared/schedule-popover';

interface SubmissionActionsProps {
  /** Whether the submission can be posted */
  canPost: boolean;
  /** Current schedule info */
  schedule: ISubmissionScheduleInfo;
  /** Whether the submission is currently scheduled */
  isScheduled: boolean;
  /** Whether the submission is currently queued/posting */
  isQueued?: boolean;
  /** Whether the submission has post history */
  hasHistory?: boolean;
  /** Handler for posting the submission */
  onPost?: () => void;
  /** Handler for canceling a queued submission */
  onCancel?: () => void;
  /** Handler for schedule changes */
  onScheduleChange?: (
    schedule: ISubmissionScheduleInfo,
    isScheduled: boolean,
  ) => void;
  /** Handler for editing the submission */
  onEdit?: () => void;
  /** Handler for duplicating the submission */
  onDuplicate?: () => void;
  /** Handler for viewing submission history */
  onViewHistory?: () => void;
  /** Handler for archiving the submission */
  onArchive?: () => void;
  /** Handler for deleting the submission */
  onDelete?: () => void;
}

/**
 * Action buttons (schedule, post) and dropdown menu for submissions.
 */
export function SubmissionActions({
  canPost,
  schedule,
  isScheduled,
  isQueued,
  hasHistory,
  onPost,
  onCancel,
  onScheduleChange,
  onEdit,
  onDuplicate,
  onViewHistory,
  onArchive,
  onDelete,
}: SubmissionActionsProps) {
  const handleEdit = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onEdit?.();
    },
    [onEdit],
  );

  const handleDuplicate = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDuplicate?.();
    },
    [onDuplicate],
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete?.();
    },
    [onDelete],
  );

  const handleViewHistory = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onViewHistory?.();
    },
    [onViewHistory],
  );

  const handleArchive = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onArchive?.();
    },
    [onArchive],
  );

  const handleCancel = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onCancel?.();
    },
    [onCancel],
  );

  const handleScheduleChange = useCallback(
    (newSchedule: ISubmissionScheduleInfo, newIsScheduled: boolean) => {
      onScheduleChange?.(newSchedule, newIsScheduled);
    },
    [onScheduleChange],
  );

  return (
    <>
      {/* Action buttons */}
      <Group gap={4}>
        {/* Schedule popover */}
        <span
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <SchedulePopover
            schedule={schedule}
            isScheduled={isScheduled}
            onChange={handleScheduleChange}
            size="sm"
          />
        </span>

        {/* Post button or Cancel button based on queue state */}
        {isQueued ? (
          <Tooltip label={<Trans>Cancel posting</Trans>}>
            <ActionIcon
              variant="subtle"
              size="sm"
              color="orange"
              onClick={handleCancel}
              // eslint-disable-next-line lingui/no-unlocalized-strings
              aria-label="Cancel posting"
            >
              <IconCancel size={16} />
            </ActionIcon>
          </Tooltip>
        ) : (
          <Tooltip label={<Trans>Hold to post</Trans>}>
            <HoldToConfirmButton
              onConfirm={onPost ?? (() => {})}
              disabled={!canPost}
              variant="subtle"
              size="sm"
              // eslint-disable-next-line lingui/no-unlocalized-strings
              aria-label="Post submission"
            >
              <IconSend size={16} />
            </HoldToConfirmButton>
          </Tooltip>
        )}
      </Group>

      {/* Actions menu */}
      <Menu position="bottom-end" withinPortal trapFocus returnFocus>
        <Menu.Target>
          <ActionIcon
            variant="subtle"
            size="sm"
            color="gray"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            // eslint-disable-next-line lingui/no-unlocalized-strings
            aria-label="Submission actions"
          >
            <IconDotsVertical size={16} />
          </ActionIcon>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Item leftSection={<IconEdit size={14} />} onClick={handleEdit}>
            <Trans>Edit</Trans>
          </Menu.Item>
          <Menu.Item
            leftSection={<IconCopy size={14} />}
            onClick={handleDuplicate}
          >
            <Trans>Duplicate</Trans>
          </Menu.Item>
          {hasHistory && onViewHistory && (
            <Menu.Item
              leftSection={<IconHistory size={14} />}
              onClick={handleViewHistory}
            >
              <Trans>View history</Trans>
            </Menu.Item>
          )}
          <Menu.Divider />
          {onArchive && (
            <Menu.Item
              leftSection={<IconArchive size={14} />}
              onClick={handleArchive}
            >
              <Trans>Archive</Trans>
            </Menu.Item>
          )}
          <Menu.Item
            leftSection={<IconTrash size={14} />}
            color="red"
            onClick={handleDelete}
          >
            <Trans>Delete</Trans>
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </>
  );
}
