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
import { CommonTranslations } from '../../../../../translations/common-translations';
import { SubmissionViewActionProps } from './submission-view-actions.props';

export function DeleteSubmissionsAction({
  selected,
  onSelect,
}: SubmissionViewActionProps) {
  return (
    <Popover withArrow position="right">
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
          <CommonTranslations.ConfirmDelete />
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
            <CommonTranslations.Delete />
          </Button>
        </Box>
      </Popover.Dropdown>
    </Popover>
  );
}
