import { Trans } from '@lingui/macro';
import {
  ActionIcon,
  Box,
  Button,
  Indicator,
  Popover,
  Text,
} from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import submissionApi from '../../../../../api/submission.api';
import { SubmissionViewActionProps } from './submission-view-actions.props';

export function DeleteSubmissionsAction({
  selected,
  onSelect,
}: SubmissionViewActionProps) {
  return (
    <Popover withArrow>
      <Popover.Target>
        <Indicator
          color="red"
          label={selected.length}
          disabled={selected.length === 0}
        >
          <ActionIcon
            style={{ verticalAlign: 'middle' }}
            variant="subtle"
            c="red"
            disabled={selected.length === 0}
          >
            <IconTrash />
          </ActionIcon>
        </Indicator>
      </Popover.Target>
      <Popover.Dropdown>
        <Text c="orange" size="lg">
          <Trans>
            Are you sure you want to delete this? This action cannot be undone.
          </Trans>
        </Text>
        <Box ta="center" mt="sm">
          <Button
            variant="light"
            color="red"
            leftSection={<IconTrash />}
            onClick={() => {
              submissionApi.remove(selected.map((s) => s.id));
              onSelect([]);
            }}
          >
            <Trans>Delete</Trans>
          </Button>
        </Box>
      </Popover.Dropdown>
    </Popover>
  );
}
