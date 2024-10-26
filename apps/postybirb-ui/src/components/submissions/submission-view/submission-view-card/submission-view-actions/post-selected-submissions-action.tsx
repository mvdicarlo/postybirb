import { Trans } from '@lingui/macro';
import {
  ActionIcon,
  Box,
  Button,
  Indicator,
  Popover,
  Text,
} from '@mantine/core';
import { IconSend } from '@tabler/icons-react';
import postApi from '../../../../../api/post.api';
import { SubmissionViewActionProps } from './submission-view-actions.props';

export function PostSelectedSubmissionsActions({
  selected,
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
            disabled={selected.length === 0}
          >
            <IconSend />
          </ActionIcon>
        </Indicator>
      </Popover.Target>
      <Popover.Dropdown>
        <Text size="lg">
          <Trans>Are you sure you want to post all selected submissions?</Trans>
        </Text>
        <Box ta="center" mt="sm">
          <Button
            variant="light"
            leftSection={<IconSend />}
            onClick={() => {
              postApi.enqueue(selected.map((s) => s.id));
            }}
          >
            <Trans>Post Selected</Trans>
          </Button>
        </Box>
      </Popover.Dropdown>
    </Popover>
  );
}
