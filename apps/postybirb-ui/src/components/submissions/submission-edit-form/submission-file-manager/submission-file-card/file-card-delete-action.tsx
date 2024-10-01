import { Trans } from '@lingui/macro';
import { ActionIcon, Box, Button, Popover, Text } from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
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
    <Popover withArrow>
      <Popover.Target>
        <ActionIcon
          disabled={totalFiles === 1}
          variant="subtle"
          style={{ verticalAlign: 'center' }}
          h="100%"
          c="red"
        >
          <IconTrash />
        </ActionIcon>
      </Popover.Target>
      <Popover.Dropdown>
        <Text c="orange" size="lg">
          <Trans>
            Are you sure you want to delete this? This action cannot be undone.
          </Trans>
        </Text>
        <Box ta="center" mt="sm">
          <Button
            disabled={totalFiles === 1}
            variant="light"
            color="red"
            leftSection={<IconTrash />}
            onClick={() => {
              fileSubmissionApi.removeFile(submissionId, file.id, 'file');
            }}
          >
            <Trans>Delete</Trans>
          </Button>
        </Box>
      </Popover.Dropdown>
    </Popover>
  );
}
