/**
 * SubmissionEditCardActions - Action buttons for the submission edit card header.
 */

import { Trans } from '@lingui/react/macro';
import { ActionIcon, Group, Tooltip } from '@mantine/core';
import {
  IconDeviceFloppy,
  IconPlayerStop,
  IconSend,
  IconTrash,
} from '@tabler/icons-react';
import postManagerApi from '../../../../../api/post-manager.api';
import postQueueApi from '../../../../../api/post-queue.api';
import submissionApi from '../../../../../api/submission.api';
import {
  showDeletedNotification,
  showDeleteErrorNotification,
  showPostErrorNotification,
} from '../../../../../utils/notifications';
import { HoldToConfirmButton } from '../../../../hold-to-confirm';
import { useSubmissionEditCardContext } from '../context';

/**
 * Actions for the submission edit card header - visible buttons, not in a menu.
 */
export function SubmissionEditCardActions() {
  const { submission } = useSubmissionEditCardContext();

  const handlePost = async () => {
    try {
      await postQueueApi.enqueue([submission.id]);
    } catch {
      showPostErrorNotification();
    }
  };

  const handleCancel = async () => {
    try {
      await postManagerApi.cancelIfRunning(submission.id);
    } catch {
      // Silently handle if not running
    }
  };

  const handleDelete = async () => {
    try {
      await submissionApi.remove([submission.id]);
      showDeletedNotification(1);
    } catch {
      showDeleteErrorNotification();
    }
  };

  if (submission.isMultiSubmission) {
    // TODO: Multi-submission actions
    return (
      <ActionIcon variant="subtle" size="sm" c="blue">
        <IconDeviceFloppy size={16} />
      </ActionIcon>
    );
  }

  if (submission.isTemplate) {
    // Templates only need delete
    return (
      <Group gap={4} wrap="nowrap" onClick={(e) => e.stopPropagation()}>
        <Tooltip label={<Trans>Hold to delete</Trans>}>
          <HoldToConfirmButton
            variant="subtle"
            size="sm"
            color="red"
            onConfirm={handleDelete}
          >
            <IconTrash size={16} />
          </HoldToConfirmButton>
        </Tooltip>
      </Group>
    );
  }

  // If currently posting, show cancel button instead of post
  if (submission.isPosting) {
    return (
      <Group gap={4} wrap="nowrap" onClick={(e) => e.stopPropagation()}>
        <Tooltip label={<Trans>Cancel posting</Trans>}>
          <ActionIcon
            variant="subtle"
            size="sm"
            color="orange"
            onClick={handleCancel}
          >
            <IconPlayerStop size={16} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label={<Trans>Hold to delete</Trans>}>
          <HoldToConfirmButton
            variant="subtle"
            size="sm"
            color="red"
            onConfirm={handleDelete}
          >
            <IconTrash size={16} />
          </HoldToConfirmButton>
        </Tooltip>
      </Group>
    );
  }

  // Normal state: show post and delete
  return (
    <Group gap={4} wrap="nowrap" onClick={(e) => e.stopPropagation()}>
      <Tooltip label={<Trans>Hold to post</Trans>}>
        <HoldToConfirmButton
          variant="subtle"
          size="sm"
          color="blue"
          onConfirm={handlePost}
        >
          <IconSend size={16} />
        </HoldToConfirmButton>
      </Tooltip>
      <Tooltip label={<Trans>Hold to delete</Trans>}>
        <HoldToConfirmButton
          variant="subtle"
          size="sm"
          color="red"
          onConfirm={handleDelete}
        >
          <IconTrash size={16} />
        </HoldToConfirmButton>
      </Tooltip>
    </Group>
  );
}
