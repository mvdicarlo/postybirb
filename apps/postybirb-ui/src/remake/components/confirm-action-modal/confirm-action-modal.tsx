/**
 * ConfirmActionModal - A generic confirmation modal for destructive or important actions.
 * Displays a title, message, and confirm/cancel buttons.
 */

import { Trans } from '@lingui/react/macro';
import {
    Button,
    Group,
    Modal,
    Stack,
    Text,
    type MantineColor,
} from '@mantine/core';

export interface ConfirmActionModalProps {
  /** Whether the modal is open */
  opened: boolean;
  /** Handler to close the modal */
  onClose: () => void;
  /** Handler when user confirms the action */
  onConfirm: () => void;
  /** Modal title */
  title: React.ReactNode;
  /** Message to display in the modal body */
  message: React.ReactNode;
  /** Label for the confirm button (default: "Confirm") */
  confirmLabel?: React.ReactNode;
  /** Label for the cancel button (default: "Cancel") */
  cancelLabel?: React.ReactNode;
  /** Color for the confirm button (default: "red" for destructive actions) */
  confirmColor?: MantineColor;
  /** Whether the confirm action is loading */
  loading?: boolean;
}

/**
 * A generic confirmation modal component.
 * Useful for delete, cancel, or other actions that need user confirmation.
 */
export function ConfirmActionModal({
  opened,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  cancelLabel,
  confirmColor = 'red',
  loading = false,
}: ConfirmActionModalProps) {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={title}
      centered
      radius="md"
    >
      <Stack>
        <Text>{message}</Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose} disabled={loading}>
            {cancelLabel ?? <Trans>Cancel</Trans>}
          </Button>
          <Button
            color={confirmColor}
            onClick={handleConfirm}
            loading={loading}
          >
            {confirmLabel ?? <Trans>Confirm</Trans>}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
