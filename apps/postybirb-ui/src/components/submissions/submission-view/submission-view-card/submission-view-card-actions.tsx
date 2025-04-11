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
import postQueueApi from '../../../../api/post-queue.api';
import submissionApi from '../../../../api/submission.api';
import { SubmissionDto } from '../../../../models/dtos/submission.dto';
import { EditSubmissionPath } from '../../../../pages/route-paths';

type SubmissionViewCardActionsProps = {
  submission: SubmissionDto;
};

export function SubmissionViewCardActions(
  props: SubmissionViewCardActionsProps,
) {
  const { submission } = props;
  const navigateTo = useNavigate();

  const hasValidationIssues = submission.validations.some(
    (v) => v.errors && v.errors.length > 0,
  );
  const hasOptions = submission.options.filter((o) => !o.isDefault).length > 0;
  const canSetForPosting =
    hasOptions && !hasValidationIssues && !submission.isQueued();
  return (
    <Group gap="0">
      <Button
        radius="0"
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
        radius="0"
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
            radius="0"
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
            radius="0"
            disabled={
              !hasOptions || hasValidationIssues || submission.isQueued()
            }
            size="xs"
            variant="subtle"
            c={canSetForPosting ? 'teal' : 'grey'}
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
          radius="0"
          disabled={!hasOptions || hasValidationIssues || submission.isQueued()}
          size="xs"
          variant="subtle"
          c={canSetForPosting ? 'teal' : 'grey'}
          leftSection={<IconSend />}
          onClick={() => {
            postQueueApi
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
          radius="0"
          disabled={!submission.isQueued()}
          size="xs"
          variant="subtle"
          c="red"
          leftSection={<IconCancel />}
          onClick={() => {
            postQueueApi.dequeue([submission.id]);
          }}
        >
          <Trans>Cancel</Trans>
        </Button>
      )}
    </Group>
  );
}
