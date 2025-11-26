import { Trans } from '@lingui/react/macro';
import { ActionIcon, Group, Menu, Text, Tooltip } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { ScheduleType } from '@postybirb/types';
import {
  IconCalendar,
  IconCalendarCancel,
  IconCancel,
  IconCopy,
  IconDots,
  IconEdit,
  IconSend,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router';
import postQueueApi from '../../../../api/post-queue.api';
import submissionApi from '../../../../api/submission.api';
import { SubmissionDto } from '../../../../models/dtos/submission.dto';
import { EditSubmissionPath } from '../../../../pages/route-paths';
import { CommonTranslations } from '../../../../translations/common-translations';
import { DeleteActionPopover } from '../../../shared/delete-action-popover/delete-action-popover';

type SubmissionViewCardActionsProps = { submission: SubmissionDto };

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

  const handleDelete = () => {
    submissionApi
      .remove([submission.id])
      .then(() => {
        notifications.show({
          message: (
            <CommonTranslations.NounDeleted>
              <Trans>Submission</Trans>
            </CommonTranslations.NounDeleted>
          ),
          color: 'green',
        });
      })
      .catch((err) => {
        notifications.show({ message: err.message, color: 'red' });
      });
  };

  return (
    <Group gap="xs" ml="auto">
      <Tooltip label={<CommonTranslations.Edit />} withArrow position="top">
        <ActionIcon
          variant="subtle"
          color="blue"
          onClick={() => {
            navigateTo(`${EditSubmissionPath}/${submission.id}`);
          }}
        >
          <IconEdit size={18} />
        </ActionIcon>
      </Tooltip>

      {!submission.isQueued() ? (
        <Tooltip
          label={
            !canSetForPosting ? (
              hasValidationIssues ? (
                <Trans>Fix validation issues</Trans>
              ) : !hasOptions ? (
                <Trans>Add website options</Trans>
              ) : (
                <Trans>Post</Trans>
              )
            ) : (
              <Trans>Post</Trans>
            )
          }
          withArrow
          position="top"
        >
          <ActionIcon
            disabled={
              !hasOptions || hasValidationIssues || submission.isQueued()
            }
            variant="subtle"
            color={canSetForPosting ? 'teal' : 'gray'}
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
            <IconSend size={18} />
          </ActionIcon>
        </Tooltip>
      ) : (
        <Tooltip label={<CommonTranslations.Cancel />} withArrow position="top">
          <ActionIcon
            disabled={!submission.isQueued()}
            variant="subtle"
            color="red"
            onClick={() => {
              postQueueApi.dequeue([submission.id]);
            }}
          >
            <IconCancel size={18} />
          </ActionIcon>
        </Tooltip>
      )}

      {submission.schedule.scheduleType !== ScheduleType.NONE ? (
        submission.isScheduled ? (
          <Tooltip label={<Trans>Unschedule</Trans>} withArrow position="top">
            <ActionIcon
              variant="subtle"
              color="red"
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
              <IconCalendarCancel size={18} />
            </ActionIcon>
          </Tooltip>
        ) : (
          <Tooltip label={<Trans>Schedule</Trans>} withArrow position="top">
            <ActionIcon
              disabled={
                !hasOptions || hasValidationIssues || submission.isQueued()
              }
              variant="subtle"
              color="teal"
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
              <IconCalendar size={18} />
            </ActionIcon>
          </Tooltip>
        )
      ) : null}

      <DeleteActionPopover
        onDelete={handleDelete}
        additionalContent={
          <Text>
            {submission.getDefaultOptions().data.title || (
              <CommonTranslations.Unknown />
            )}
          </Text>
        }
      />

      <Menu shadow="md" width={200} position="bottom-end">
        <Menu.Target>
          <ActionIcon variant="subtle">
            <IconDots size={18} />
          </ActionIcon>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Item
            leftSection={<IconCopy size={16} />}
            onClick={() => {
              submissionApi
                .duplicate(submission.id)
                .then(() => {
                  notifications.show({
                    message: (
                      <CommonTranslations.NounCreated>
                        <Trans>Submission</Trans>
                      </CommonTranslations.NounCreated>
                    ),
                    color: 'green',
                  });
                })
                .catch((err) => {
                  notifications.show({ message: err.message, color: 'red' });
                });
            }}
          >
            <Trans>Duplicate</Trans>
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </Group>
  );
}
