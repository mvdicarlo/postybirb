import {
  ActionIcon,
  Button,
  Group,
  Popover,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import { IconAlertTriangle, IconTrash } from '@tabler/icons-react';
import { useState } from 'react';
import { CommonTranslations } from '../../../translations/common-translations';

type DeleteActionPopoverProps = {
  additionalContent?: JSX.Element;
  disabled?: boolean;
  showText?: boolean;
  onDelete: () => void;
};

export function DeleteActionPopover(props: DeleteActionPopoverProps) {
  const { showText, additionalContent, disabled, onDelete } = props;
  const [opened, setOpened] = useState(false);

  return (
    <Popover
      withArrow
      opened={opened}
      onChange={setOpened}
      trapFocus
      position="top"
      width={300}
      shadow="md"
      radius="md"
    >
      <Popover.Target>
        {showText ? (
          <Button
            variant="light"
            color="red"
            leftSection={<IconTrash size={16} />}
            onClick={() => setOpened(true)}
            disabled={disabled}
          >
            <CommonTranslations.Delete />
          </Button>
        ) : (
          <Tooltip label={<CommonTranslations.Delete />} withArrow>
            <ActionIcon
              variant="subtle"
              color="red"
              onClick={() => setOpened(true)}
              disabled={disabled}
            >
              <IconTrash size={16} />
            </ActionIcon>
          </Tooltip>
        )}
      </Popover.Target>
      <Popover.Dropdown p="md">
        <Stack gap="md">
          <Group gap="sm" wrap="nowrap">
            <IconAlertTriangle
              size={20}
              style={{ color: 'var(--mantine-color-red-6)', flexShrink: 0 }}
            />
            <Text fw={600} size="sm" c="red">
              <CommonTranslations.ConfirmDelete />
            </Text>
          </Group>
          {additionalContent && (
            <Text size="sm" c="dimmed">
              {additionalContent}
            </Text>
          )}
          <Group grow gap="xs">
            <Button
              variant="default"
              size="sm"
              onClick={() => setOpened(false)}
              autoFocus
            >
              <CommonTranslations.Cancel />
            </Button>
            <Button
              color="red"
              size="sm"
              leftSection={<IconTrash size={16} />}
              onClick={() => {
                onDelete();
                setOpened(false);
              }}
            >
              <CommonTranslations.Delete />
            </Button>
          </Group>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
