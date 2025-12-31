/**
 * SubmissionEditCardActions - Action buttons for the submission edit card header.
 */

import { Trans } from '@lingui/react/macro';
import { ActionIcon, Group, Tooltip } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconArchiveOff,
  IconHistory,
  IconCancel,
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
import { SubmissionHistoryDrawer } from '../../submission-history-drawer';
import { useSubmissionEditCardContext } from '../context';
import { ApplyTemplateAction } from './apply-template-action';
import { SaveToManyAction } from './save-to-many-action';

/**
 * Actions for the submission edit card header - visible buttons, not in a menu.
 */
export function SubmissionEditCardActions() {
  const { submission } = useSubmissionEditCardContext();
  const [historyOpened, historyDrawer] = useDisclosure(false);

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

  const handleUnarchive = async () => {
    try {
      await submissionApi.unarchive(submission.submissionId);
      notifications.show({
        message: <Trans>Submission restored</Trans>,
        color: 'green',
      });
    } catch {
      notifications.show({
        message: <Trans>Failed to restore submission</Trans>,
        color: 'red',
      });
    }
  };

  if (submission.isMultiSubmission) {
    return (
      <Group gap={4} wrap="nowrap" onClick={(e) => e.stopPropagation()}>
        <ApplyTemplateAction />
        <SaveToManyAction />
      </Group>
    );
  }

  // Archived submissions: show history (if available), unarchive and delete
  if (submission.isArchived) {
    const hasHistory = submission.posts.length > 0;
    return (
      <>
        <Group gap={4} wrap="nowrap" onClick={(e) => e.stopPropagation()}>
          {hasHistory && (
            <Tooltip label={<Trans>View history</Trans>}>
              <ActionIcon
                variant="subtle"
                size="sm"
                onClick={historyDrawer.open}
              >
                <IconHistory size={16} />
              </ActionIcon>
            </Tooltip>
          )}
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
          <Tooltip label={<Trans>Hold to delete permanently</Trans>}>
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

        {/* History drawer */}
        <SubmissionHistoryDrawer
          opened={historyOpened}
          onClose={historyDrawer.close}
          submission={submission}
        />
      </>
    );
  }

  if (submission.isTemplate) {
    // Templates need delete only
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
            <IconCancel size={16} />
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

  // Check if submission can be posted
  const canPost = !submission.hasErrors && submission.hasWebsiteOptions;

  // Check if submission has history
  const hasHistory = submission.posts.length > 0;

  // Determine tooltip message for disabled post button
  let postTooltip: React.ReactNode = <Trans>Hold to post</Trans>;
  if (submission.hasErrors) {
    postTooltip = <Trans>Submission has validation errors</Trans>;
  } else if (!submission.hasWebsiteOptions) {
    postTooltip = <Trans>No websites selected</Trans>;
  }

  // Normal state: show template, history (if available), post and delete
  return (
    <>
      <Group gap={4} wrap="nowrap" onClick={(e) => e.stopPropagation()}>
        <ApplyTemplateAction />
        {hasHistory && (
          <Tooltip label={<Trans>View history</Trans>}>
            <ActionIcon variant="subtle" size="sm" onClick={historyDrawer.open}>
              <IconHistory size={16} />
            </ActionIcon>
          </Tooltip>
        )}
        <Tooltip label={postTooltip}>
          <HoldToConfirmButton
            variant="subtle"
            size="sm"
            color="blue"
            onConfirm={handlePost}
            disabled={!canPost}
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

      {/* History drawer */}
      <SubmissionHistoryDrawer
        opened={historyOpened}
        onClose={historyDrawer.close}
        submission={submission}
      />
    </>
  );
}
