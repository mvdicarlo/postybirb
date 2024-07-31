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
import { notifications } from '@mantine/notifications';
import { SubmissionType } from '@postybirb/types';
import {
  IconCalendar,
  IconSearch,
  IconSquare,
  IconSquareFilled,
  IconSquareMinus,
  IconTemplate,
  IconTrash,
} from '@tabler/icons-react';
import { useState } from 'react';
import submissionApi from '../../../api/submission.api';
import websiteOptionsApi from '../../../api/website-options.api';
import { SubmissionDto } from '../../../models/dtos/submission.dto';
import TemplatePickerModal from '../../submission-templates/template-picker-modal/template-picker-modal';
import { SubmissionViewMultiSchedulerModal } from './submission-view-card/submission-view-multi-scheduler-modal';

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
  const [templatePickerVisible, setTemplatePickerVisible] = useState(false);
  const [multiScheduleVisible, setMultiScheduleVisible] = useState(false);

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
            variant="subtle"
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
    <>
      <Button
        variant="transparent"
        c="var(--mantine-color-text)"
        disabled={selectedSubmissions.length === 0}
        leftSection={<IconTemplate />}
        onClick={() => setTemplatePickerVisible(true)}
      >
        <Trans>Apply Template</Trans>
      </Button>
      {templatePickerVisible ? (
        <TemplatePickerModal
          type={type}
          submissionId={
            selectedSubmissions.length === 1
              ? selectedSubmissions[0].id
              : undefined
          }
          onClose={() => setTemplatePickerVisible(false)}
          onApply={(options) => {
            setTemplatePickerVisible(false);
            selectedSubmissions.forEach((submission) => {
              Promise.all(
                options.map((option) =>
                  websiteOptionsApi.create({
                    submission: submission.id,
                    account: option.account,
                    data: option.data,
                  })
                )
              )
                .then(() => {
                  notifications.show({
                    color: 'green',
                    title: submission.getDefaultOptions().data.title,
                    message: <Trans>Template applied</Trans>,
                  });
                })
                .catch((err) => {
                  notifications.show({
                    color: 'red',
                    title: submission.getDefaultOptions().data.title,
                    message: err.message,
                  });
                });
            });
          }}
        />
      ) : null}
    </>
  );

  const scheduleMany = (
    <>
      <Button
        variant="transparent"
        c="var(--mantine-color-text)"
        disabled={selectedSubmissions.length === 0}
        leftSection={<IconCalendar />}
        onClick={() => setMultiScheduleVisible(true)}
      >
        <Trans>Schedule Many</Trans>
      </Button>
      {multiScheduleVisible ? (
        <SubmissionViewMultiSchedulerModal
          submissions={selectedSubmissions}
          onClose={() => setMultiScheduleVisible(false)}
          onApply={(s) => {
            setMultiScheduleVisible(false);
            // TODO: Implement onApply
          }}
        />
      ) : null}
    </>
  );

  return (
    <Box>
      <Paper shadow="xs" p="xs">
        <Flex align="center">
          <Group pr="sm" gap="xs">
            {submissionSelectionAction}
            {deleteSubmissionAction}
            {applyTemplateAction}
            {scheduleMany}
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
