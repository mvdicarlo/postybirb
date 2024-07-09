/* eslint-disable no-nested-ternary */
import { Trans } from '@lingui/macro';
import { Button, Group } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { ScheduleType } from '@postybirb/types';
import {
    IconCalendar,
    IconCalendarCancel,
    IconCancel,
    IconCopy,
    IconEdit,
    IconSend,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router';
import postApi from '../../../../api/post.api';
import submissionApi from '../../../../api/submission.api';
import { SubmissionDto } from '../../../../models/dtos/submission.dto';
import { EditSubmissionPath } from '../../../../pages/route-paths';

type SubmissionViewCardActionsProps = {
  submission: SubmissionDto;
};

export function SubmissionViewCardActions(
  props: SubmissionViewCardActionsProps
) {
  const { submission } = props;
  const navigateTo = useNavigate();

  const hasValidationIssues = submission.validations.some(
    (v) => v.errors && v.errors.length > 0
  );
  const hasOptions = submission.options.filter((o) => !o.isDefault).length > 0;
  return (
    <Group gap="xs">
      <Button
        size="xs"
        variant="subtle"
        c="pink"
        leftSection={<IconCopy />}
        onClick={() => {
          submissionApi
            .duplicate(submission.id)
            .then(() => {
              notifications.show({
                message: <Trans>Submission duplicated</Trans>,
                color: 'green',
              });
            })
            .catch((err) => {
              notifications.show({
                title: <Trans>Failed to duplicate</Trans>,
                message: err.message,
                color: 'red',
              });
            });
        }}
      >
        <Trans>Duplicate</Trans>
      </Button>
      <Button
        size="xs"
        variant="subtle"
        leftSection={<IconEdit />}
        onClick={() => {
          navigateTo(`${EditSubmissionPath}/${submission.id}`);
        }}
      >
        <Trans>Edit</Trans>
      </Button>
      {submission.schedule.scheduleType !== ScheduleType.NONE ? (
        submission.isScheduled ? (
          <Button
            disabled={!submission.isQueued()}
            size="xs"
            variant="subtle"
            c="red"
            leftSection={<IconCalendarCancel />}
            onClick={() => {
              submissionApi.update(submission.id, {
                metadata: submission.metadata,
                ...submission.schedule,
                isScheduled: false,
                newOrUpdatedOptions: [],
                deletedWebsiteOptions: [],
              });
            }}
          >
            <Trans>Unschedule</Trans>
          </Button>
        ) : (
          <Button
            disabled={
              !hasOptions || hasValidationIssues || submission.isQueued()
            }
            size="xs"
            variant="subtle"
            c="teal"
            leftSection={<IconCalendar />}
            onClick={() => {
              submissionApi
                .update(submission.id, {
                  metadata: submission.metadata,
                  ...submission.schedule,
                  isScheduled: true,
                  newOrUpdatedOptions: [],
                  deletedWebsiteOptions: [],
                })
                .then(() => {
                  notifications.show({
                    color: 'green',
                    message: <Trans>Submission scheduled</Trans>,
                  });
                })
                .catch((err) => {
                  notifications.show({
                    title: <Trans>Failed to schedule submission</Trans>,
                    message: err.message,
                    color: 'red',
                  });
                });
            }}
          >
            <Trans>Schedule</Trans>
          </Button>
        )
      ) : null}
      {!submission.isQueued() ? (
        <Button
          disabled={!hasOptions || hasValidationIssues || submission.isQueued()}
          size="xs"
          variant="subtle"
          c={hasValidationIssues ? 'red' : hasOptions ? 'teal' : 'grey'}
          leftSection={<IconSend />}
          onClick={() => {
            postApi
              .enqueue([submission.id])
              .then(() => {
                notifications.show({
                  message: <Trans>Submission queued</Trans>,
                  color: 'green',
                });
              })
              .catch((err) => {
                notifications.show({
                  title: <Trans>Failed to queue submission</Trans>,
                  message: err.message,
                  color: 'red',
                });
              });
          }}
        >
          <Trans>Post</Trans>
        </Button>
      ) : (
        <Button
          disabled={!submission.isQueued()}
          size="xs"
          variant="subtle"
          c="red"
          leftSection={<IconCancel />}
          onClick={() => {
            postApi.dequeue([submission.id]);
          }}
        >
          <Trans>Cancel</Trans>
        </Button>
      )}
    </Group>
  );
}
