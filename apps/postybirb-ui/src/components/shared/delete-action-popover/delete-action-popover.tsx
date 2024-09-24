import { Trans } from '@lingui/macro';
import { ActionIcon, Box, Button, Popover, Text, Tooltip } from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';

type DeleteActionPopoverProps = {
  additionalContent?: JSX.Element;
  disabled?: boolean;
  onDelete: () => void;
};

export function DeleteActionPopover(props: DeleteActionPopoverProps) {
  const { additionalContent, disabled, onDelete } = props;
  return (
    <Popover withArrow>
      <Popover.Target>
        <Tooltip label={<Trans>Delete</Trans>}>
          <ActionIcon variant="transparent" c="red" disabled={disabled}>
            <IconTrash />
          </ActionIcon>
        </Tooltip>
      </Popover.Target>
      <Popover.Dropdown>
        <Text c="orange" size="lg">
          <Trans>
            Are you sure you want to delete this? This action cannot be undone.
          </Trans>
        </Text>
        {additionalContent}
        <Box ta="center" mt="sm">
          <Button
            disabled={disabled}
            autoFocus
            variant="light"
            color="red"
            leftSection={<IconTrash />}
            onClick={onDelete}
          >
            <Trans>Delete</Trans>
          </Button>
        </Box>
      </Popover.Dropdown>
    </Popover>
  );
}
