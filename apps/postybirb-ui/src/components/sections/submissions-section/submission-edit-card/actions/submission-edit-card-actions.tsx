/**
 * SubmissionEditCardActions - Action buttons for the submission edit card header.
 */

import { Trans } from '@lingui/react/macro';
import { ActionIcon, Group, Tooltip } from '@mantine/core';
import {
    IconArchiveOff,
    IconCancel,
    IconEye,
    IconHelp,
    IconHistory,
    IconSend,
    IconTrash,
} from '@tabler/icons-react';
import { useState } from 'react';
import postManagerApi from '../../../../../api/post-manager.api';
import postQueueApi from '../../../../../api/post-queue.api';
import submissionApi from '../../../../../api/submission.api';
import { useIsSubmissionPosting } from '../../../../../stores/ui/posting-state-store';
import { useSubmissionHistoryDrawerStore } from '../../../../../stores/ui/submission-history-drawer-store';
import { useTourActions } from '../../../../../stores/ui/tour-store';
import {
    showDeletedNotification,
    showDeleteErrorNotification,
    showPostErrorNotification,
    showRestoredNotification,
    showRestoreErrorNotification,
} from '../../../../../utils/notifications';
import { HoldToConfirmButton } from '../../../../hold-to-confirm';
import { SUBMISSION_EDIT_TOUR_ID } from '../../../../onboarding-tour/tours/submission-edit-tour';
import { PostPreviewModal } from '../../post-preview-modal';
import { useSubmissionEditCardContext } from '../context';
import { ApplyTemplateAction } from './apply-template-action';
import { SaveToManyAction } from './save-to-many-action';

/**
 * Actions for the submission edit card header - visible buttons, not in a menu.
 */
export function SubmissionEditCardActions() {
  const { submission } = useSubmissionEditCardContext();
  const { startTour } = useTourActions();
  const isPosting = useIsSubmissionPosting(submission.id);
  const [previewOpen, setPreviewOpen] = useState(false);

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
      showRestoredNotification();
    } catch {
      showRestoreErrorNotification();
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
    const hasHistory = true;
    return (
      <Group gap={4} wrap="nowrap" onClick={(e) => e.stopPropagation()}>
          {hasHistory && (
            <Tooltip label={<Trans>View history</Trans>}>
              <ActionIcon
                variant="subtle"
                size="sm"
                onClick={() => useSubmissionHistoryDrawerStore.getState().open(submission.id)}
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

  // If currently posting, show cancel button
  if (isPosting) {
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

  // Determine tooltip message for disabled post button
  let postTooltip: React.ReactNode = <Trans>Hold to post</Trans>;
  if (submission.hasErrors) {
    postTooltip = <Trans>Submission has validation errors</Trans>;
  } else if (!submission.hasWebsiteOptions) {
    postTooltip = <Trans>No websites selected</Trans>;
  }

  // Normal state: show template, post and delete
  return (
    <Group gap={4} wrap="nowrap" onClick={(e) => e.stopPropagation()}>
      <Tooltip label={<Trans>Editor Tour</Trans>}>
        <ActionIcon variant="subtle" size="sm" onClick={() => startTour(SUBMISSION_EDIT_TOUR_ID)}>
          <IconHelp size={16} />
        </ActionIcon>
      </Tooltip>
      <ApplyTemplateAction />
      <Tooltip label={<Trans>Preview (dry run)</Trans>}>
        <ActionIcon
          variant="subtle"
          size="sm"
          disabled={!submission.hasWebsiteOptions}
          onClick={() => setPreviewOpen(true)}
        >
          <IconEye size={16} />
        </ActionIcon>
      </Tooltip>
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
      <PostPreviewModal
        opened={previewOpen}
        onClose={() => setPreviewOpen(false)}
        submissionId={submission.id}
      />
    </Group>
  );
}
