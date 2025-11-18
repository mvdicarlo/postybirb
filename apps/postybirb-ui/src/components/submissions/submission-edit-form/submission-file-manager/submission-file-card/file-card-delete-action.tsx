import { Trans } from "@lingui/react/macro";
import { ActionIcon, Button, Group, Popover, Text } from '@mantine/core';
import { IconTrash, IconX } from '@tabler/icons-react';
import fileSubmissionApi from '../../../../../api/file-submission.api';

type FileCardDeleteActionProps = {
  submissionId: string;
  file: { id: string };
  totalFiles: number;
};

export function FileCardDeleteAction({
  submissionId,
  file,
  totalFiles,
}: FileCardDeleteActionProps) {
  return (
    <Popover withArrow width={250} position="left">
      <Popover.Target>
        <ActionIcon
          disabled={totalFiles === 1}
          variant="subtle"
          color="red"
          radius="xl"
          size="lg"
          style={{ opacity: totalFiles === 1 ? 0.5 : 1 }}
        >
          <IconTrash size={18} />
        </ActionIcon>
      </Popover.Target>
      <Popover.Dropdown>
        <Text fw={600} size="sm" c="orange">
          <Trans>Delete this file?</Trans>
        </Text>
        <Text size="xs" c="dimmed" mt={4} mb={12}>
          <Trans>This action cannot be undone.</Trans>
        </Text>
        <Group p="apart">
          <Button
            variant="subtle"
            color="gray"
            size="xs"
            leftSection={<IconX size={14} />}
          >
            <Trans>Cancel</Trans>
          </Button>
          <Button
            disabled={totalFiles === 1}
            variant="filled"
            color="red"
            size="xs"
            leftSection={<IconTrash size={14} />}
            onClick={() => {
              fileSubmissionApi.removeFile(submissionId, file.id, 'file');
            }}
          >
            <Trans>Delete</Trans>
          </Button>
        </Group>
      </Popover.Dropdown>
    </Popover>
  );
}
