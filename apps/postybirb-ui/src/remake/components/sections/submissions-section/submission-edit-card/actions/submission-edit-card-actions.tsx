/**
 * SubmissionEditCardActions - Action buttons for the submission edit card header.
 */

import { Trans } from '@lingui/react/macro';
import { ActionIcon, Group, Tooltip } from '@mantine/core';
import { IconDeviceFloppy, IconSend, IconTrash } from '@tabler/icons-react';
import { HoldToConfirmButton } from '../../../../hold-to-confirm';
import { useSubmissionEditCardContext } from '../context';

/**
 * Actions for the submission edit card header - visible buttons, not in a menu.
 */
export function SubmissionEditCardActions() {
  const { submission } = useSubmissionEditCardContext();

  const handlePost = () => {
    // TODO: Implement post action
    // eslint-disable-next-line no-console
    console.log('Post submission');
  };

  const handleDelete = () => {
    // TODO: Implement delete action
    // eslint-disable-next-line no-console
    console.log('Delete submission');
  };

  if (submission.isMultiSubmission) {
    // TODO
    return (
      <ActionIcon variant="subtle" size="sm" c="blue">
        <IconDeviceFloppy size={16} />
      </ActionIcon>
    );
  }

  if (submission.isTemplate) {
    // TODO
    return (
      <ActionIcon variant="subtle" size="sm" c="blue">
        <IconDeviceFloppy size={16} />
      </ActionIcon>
    );
  }

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
