import { Trans, msg } from '@lingui/macro';
import { useLingui } from '@lingui/react';
import {
  ActionIcon,
  Button,
  Group,
  Popover,
  Text,
  Tooltip,
} from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import { useState } from 'react';

type DeleteActionPopoverProps = {
  additionalContent?: JSX.Element;
  disabled?: boolean;
  showText?: boolean;
  onDelete: () => void;
};

export function DeleteActionPopover(props: DeleteActionPopoverProps) {
  const { _ } = useLingui();
  const { showText, additionalContent, disabled, onDelete } = props;
  const [opened, setOpened] = useState(false);

  return (
    <Popover
      withArrow
      opened={opened}
      onChange={setOpened}
      trapFocus
      position="top"
      width={260}
    >
      <Popover.Target>
        {showText ? (
          <Button
            variant="light"
            color="red"
            leftSection={<IconTrash size={16} />}
            onClick={() => setOpened(true)}
            disabled={disabled}
            aria-label={_(msg`Delete item`)}
          >
            <Trans>Delete</Trans>
          </Button>
        ) : (
          <Tooltip label={<Trans>Delete</Trans>}>
            <ActionIcon
              variant="subtle"
              color="red"
              onClick={() => setOpened(true)}
              disabled={disabled}
              aria-label={_(msg`Delete item`)}
            >
              <IconTrash size={16} />
            </ActionIcon>
          </Tooltip>
        )}
      </Popover.Target>
      <Popover.Dropdown>
        <Text c="orange" size="sm">
          <Trans>
            Are you sure you want to delete this? This action cannot be undone.
          </Trans>
        </Text>
        {additionalContent}
        <Group grow mt="md">
          <Button
            variant="default"
            size="compact-sm"
            onClick={() => setOpened(false)}
          >
            <Trans>Cancel</Trans>
          </Button>
          <Button
            color="red"
            size="compact-sm"
            onClick={() => {
              onDelete();
              setOpened(false);
            }}
          >
            <Trans>Delete</Trans>
          </Button>
        </Group>
      </Popover.Dropdown>
    </Popover>
  );
}
