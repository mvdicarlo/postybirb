/* eslint-disable no-nested-ternary */
import { Trans, msg } from '@lingui/macro';
import { useLingui } from '@lingui/react';
import {
  ActionIcon,
  Box,
  Button,
  Flex,
  Group,
  Indicator,
  Input,
  Paper,
  Popover,
  Text,
} from '@mantine/core';
import { SubmissionType } from '@postybirb/types';
import {
  IconSearch,
  IconSquare,
  IconSquareFilled,
  IconSquareMinus,
  IconTemplate,
  IconTrash,
} from '@tabler/icons-react';
import submissionApi from '../../../api/submission.api';
import { SubmissionDto } from '../../../models/dtos/submission.dto';

type SubmissionViewActionsProps = {
  submissions: SubmissionDto[];
  type: SubmissionType;
  selectedSubmissions: SubmissionDto[];
  onSelect(submissions: SubmissionDto[]): void;
  nameFilter: string;
  setNameFilter(filter: string): void;
};

export function SubmissionViewActions(props: SubmissionViewActionsProps) {
  const {
    submissions,
    type,
    onSelect,
    selectedSubmissions,
    nameFilter,
    setNameFilter,
  } = props;
  const { _ } = useLingui();

  const submissionSelectionAction = (
    <ActionIcon
      variant="transparent"
      c="var(--mantine-color-text)"
      onClick={() => {
        if (selectedSubmissions.length === submissions.length) {
          onSelect([]);
        } else {
          onSelect(submissions);
        }
      }}
    >
      {selectedSubmissions.length > 0 ? (
        submissions.length === selectedSubmissions.length ? (
          <IconSquareFilled />
        ) : (
          <IconSquareMinus />
        )
      ) : (
        <IconSquare />
      )}
    </ActionIcon>
  );

  const deleteSubmissionAction = (
    <Popover withArrow>
      <Popover.Target>
        <Indicator
          color="red"
          label={selectedSubmissions.length}
          disabled={selectedSubmissions.length === 0}
        >
          <ActionIcon
            style={{ verticalAlign: 'middle' }}
            variant="transparent"
            c="red"
            disabled={selectedSubmissions.length === 0}
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
              submissionApi.remove(selectedSubmissions.map((s) => s.id));
              onSelect([]);
            }}
          >
            <Trans>Delete</Trans>
          </Button>
        </Box>
      </Popover.Dropdown>
    </Popover>
  );

  const applyTemplateAction = (
    <Popover withArrow>
      <Popover.Target>
        <Button
          variant="transparent"
          c="var(--mantine-color-text)"
          disabled={selectedSubmissions.length === 0}
          leftSection={<IconTemplate />}
        >
          <Trans>Apply Template</Trans>
        </Button>
      </Popover.Target>
      <Popover.Dropdown>TODO</Popover.Dropdown>
    </Popover>
  );

  return (
    <Box>
      <Paper shadow="xs" p="xs">
        <Flex align="center">
          <Group pr="sm">
            {submissionSelectionAction}
            {deleteSubmissionAction}
            {applyTemplateAction}
          </Group>
          <Input
            flex="6"
            placeholder={_(msg`Search`)}
            width="100%"
            leftSection={<IconSearch />}
            value={nameFilter}
            onChange={(event) => setNameFilter(event.currentTarget.value)}
          />
        </Flex>
      </Paper>
    </Box>
  );
}
