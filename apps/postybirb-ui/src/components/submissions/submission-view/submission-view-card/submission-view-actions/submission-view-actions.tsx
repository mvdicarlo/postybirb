/* eslint-disable no-nested-ternary */
import { msg } from '@lingui/macro';
import { useLingui } from '@lingui/react';
import { Box, Flex, Group, Input, Paper } from '@mantine/core';
import { SubmissionType } from '@postybirb/types';
import { IconSearch } from '@tabler/icons-react';
import { SubmissionDto } from '../../../../../models/dtos/submission.dto';
import { ApplySubmissionTemplateAction } from './apply-submission-template-action';
import { DeleteSubmissionsAction } from './delete-submissions-action';
import { PostSelectedSubmissionsActions } from './post-selected-submissions-action';
import { ScheduleSubmissionsActions } from './schedule-submissions-action';
import { SelectSubmissionsAction } from './select-submissions-action';
import { SubmissionViewActionProps } from './submission-view-actions.props';

type SubmissionViewActionsProps = {
  submissions: SubmissionDto[];
  type: SubmissionType;
  selectedSubmissions: SubmissionDto[];
  onSelect(submissions: SubmissionDto[]): void;
  nameFilter: string;
  setNameFilter(filter: string): void;
};

// TODO - Schedule Selected
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

  const actionProps: SubmissionViewActionProps = {
    submissions,
    selected: selectedSubmissions,
    type,
    onSelect,
  };

  return (
    <Box>
      <Paper shadow="xs" p="xs">
        <Flex align="center">
          <Group pr="sm" gap="xs">
            <SelectSubmissionsAction {...actionProps} />
            <DeleteSubmissionsAction {...actionProps} />
            <PostSelectedSubmissionsActions {...actionProps} />
            <ApplySubmissionTemplateAction {...actionProps} />
            <ScheduleSubmissionsActions {...actionProps} />
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
