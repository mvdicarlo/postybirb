import { useLingui } from '@lingui/react/macro';
import { Box, Flex, Group, Input, Paper } from '@mantine/core';
import { SubmissionType } from '@postybirb/types';
import { IconSearch } from '@tabler/icons-react';
import { SubmissionDto } from '../../../../../models/dtos/submission.dto';
import { ApplySubmissionTemplateAction } from './apply-submission-template-action';
import { DeleteSubmissionsAction } from './delete-submissions-action';
import { MultiEditSubmissionsAction } from './multi-edit-submissions-action';
import { PostSelectedSubmissionsActions } from './post-selected-submissions-action';
import { ScheduleSubmissionsActions } from './schedule-submissions-action';
import { SelectSubmissionsAction } from './select-submissions-action';
import { SubmissionViewActionProps } from './submission-view-actions.props';
import { SubmissionViewLayoutAction } from './submission-view-layout-action';

type SubmissionViewActionsProps = {
  submissions: SubmissionDto[];
  type: SubmissionType;
  selectedSubmissions: SubmissionDto[];
  view: 'grid' | 'list';
  onSelect(submissions: SubmissionDto[]): void;
  nameFilter: string;
  setNameFilter(filter: string): void;
  setView(view: 'grid' | 'list'): void;
};

export function SubmissionViewActions(props: SubmissionViewActionsProps) {
  const {
    submissions,
    type,
    onSelect,
    selectedSubmissions,
    nameFilter,
    setNameFilter,
    view,
    setView,
  } = props;
  const { t } = useLingui();

  const actionProps: SubmissionViewActionProps = {
    submissions,
    selected: selectedSubmissions,
    type,
    view,
    onSelect,
    setView,
  };

  return (
    <Box>
      <Paper shadow="xs" p="xs">
        <Flex align="center">
          <Group pr="sm" gap="xs">
            <SubmissionViewLayoutAction {...actionProps} />
            <SelectSubmissionsAction {...actionProps} />
            <DeleteSubmissionsAction {...actionProps} />
            <PostSelectedSubmissionsActions {...actionProps} />
            <ApplySubmissionTemplateAction {...actionProps} />
            <ScheduleSubmissionsActions {...actionProps} />
            <MultiEditSubmissionsAction {...actionProps} />
          </Group>
          <Input
            flex="6"
            placeholder={t`Search`}
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
