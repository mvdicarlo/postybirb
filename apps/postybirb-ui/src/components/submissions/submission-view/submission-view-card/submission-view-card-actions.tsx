import { Trans } from "@lingui/react/macro";
import {
  ActionIcon,
  Group,
  Button as MantineButton,
  Menu,
  Modal,
  Text,
  Tooltip
} from '@mantine/core';
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
  IconTrash,
} from '@tabler/icons-react';
import { useState } from 'react';
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
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

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
          message: <Trans>Submission deleted</Trans>,
          color: 'green',
        });
        setDeleteModalOpen(false);
      })
      .catch((err) => {
        notifications.show({
          title: <Trans>Failed to delete</Trans>,
          message: err.message,
          color: 'red',
        });
        setDeleteModalOpen(false);
      });
  };

  return (
    <>
      <Group gap="xs" ml="auto">
        <Tooltip label={<Trans>Edit</Trans>} withArrow position="top">
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
          <Tooltip label={<Trans>Cancel post</Trans>} withArrow position="top">
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

        <Tooltip label={<Trans>Delete</Trans>} withArrow position="top">
          <ActionIcon
            variant="subtle"
            color="red"
            onClick={() => setDeleteModalOpen(true)}
          >
            <IconTrash size={18} />
          </ActionIcon>
        </Tooltip>

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
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>

      <Modal
        opened={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title={
          <Text fw={700} size="lg">
            <Trans>Delete Submission</Trans>
          </Text>
        }
        centered
      >
        <Text mb="md">
          <Trans>
            Are you sure you want to delete this submission? This action cannot
            be undone.
          </Trans>
        </Text>
        <Text mb="xl" fw={500} size="sm">
          {submission.getDefaultOptions().data.title || (
            <Trans>Untitled submission</Trans>
          )}
        </Text>
        <Group p="right" gap="md">
          <MantineButton
            variant="outline"
            onClick={() => setDeleteModalOpen(false)}
          >
            <Trans>Cancel</Trans>
          </MantineButton>
          <MantineButton color="red" onClick={handleDelete}>
            <Trans>Delete</Trans>
          </MantineButton>
        </Group>
      </Modal>
    </>
  );
}
