import { Trans } from '@lingui/macro';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Group,
  Modal,
  Paper,
  ScrollArea,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IPostQueueRecord, PostRecordDto } from '@postybirb/types';
import { IconCalendarCancel, IconTrash, IconX } from '@tabler/icons-react';
import { SubmissionDto } from 'apps/postybirb-ui/src/models/dtos/submission.dto';
import { defaultTargetProvider } from 'apps/postybirb-ui/src/transports/http-client';
import { format } from 'date-fns';
import { useMemo } from 'react';
import postManagerApi from '../../../api/post-manager.api';
import postQueueApi from '../../../api/post-queue.api';
import submissionApi from '../../../api/submission.api';
import styles from './submissions-list.module.css';

interface SubmissionData {
  id: string;
  title: string;
  isQueued: boolean;
  isPosting: boolean;
  isScheduled: boolean;
  scheduledFor?: string;
  thumbnailUrl?: string;
}

interface SubmissionItemProps {
  submission: SubmissionData;
  onCancel: () => void;
  onUnqueue: () => void;
  onUnschedule: () => void;
}

function SubmissionItem({
  submission,
  onCancel,
  onUnqueue,
  onUnschedule,
}: SubmissionItemProps) {
  const [confirmModalOpened, confirmModal] = useDisclosure(false);

  let statusBadge = null;
  let itemClass = '';

  if (submission.isPosting) {
    statusBadge = (
      <Badge color="teal">
        <Trans>Posting</Trans>
      </Badge>
    );
    itemClass = styles.activePosting;
  } else if (submission.isQueued) {
    statusBadge = (
      <Badge color="blue">
        <Trans>Queued</Trans>
      </Badge>
    );
    itemClass = styles.queuedItem;
  } else if (submission.isScheduled) {
    statusBadge = (
      <Badge color="violet">
        <Trans>Scheduled</Trans>
      </Badge>
    );
    itemClass = styles.scheduledItem;
  }

  const scheduledDate = submission.scheduledFor
    ? // eslint-disable-next-line lingui/no-unlocalized-strings
      format(new Date(submission.scheduledFor), 'PPp')
    : null;

  return (
    <>
      <Modal
        opened={confirmModalOpened}
        onClose={confirmModal.close}
        title={<Trans>Confirm Cancellation</Trans>}
      >
        <Stack>
          <Text>
            <Trans>
              Are you sure you want to cancel this submission? The app is not
              responsible for any partial post clean-up.
            </Trans>
          </Text>
          <Group align="right">
            <Button variant="default" onClick={confirmModal.close}>
              <Trans>Cancel</Trans>
            </Button>
            <Button
              color="red"
              onClick={() => {
                onCancel();
                confirmModal.close();
              }}
            >
              <Trans>Yes, Cancel Posting</Trans>
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Box className={`${styles.item} ${itemClass}`}>
        <Group align="apart">
          <Group>
            {submission.thumbnailUrl && (
              <img
                src={submission.thumbnailUrl}
                alt={submission.title}
                style={{
                  width: 50,
                  height: 50,
                  objectFit: 'cover',
                  borderRadius: '4px',
                }}
              />
            )}
            <Box>
              <Text fw={500}>{submission.title}</Text>
              <Group gap="xs">
                {statusBadge}
                {scheduledDate && (
                  <Text size="sm" color="dimmed">
                    {scheduledDate}
                  </Text>
                )}
              </Group>
            </Box>
          </Group>
          <Group gap="xs">
            {submission.isPosting && (
              <ActionIcon color="red" onClick={confirmModal.open}>
                <IconX size={16} />
              </ActionIcon>
            )}
            {submission.isQueued && !submission.isPosting && (
              <ActionIcon color="orange" onClick={onUnqueue}>
                <IconTrash size={16} />
              </ActionIcon>
            )}
            {submission.isScheduled && (
              <ActionIcon color="violet" onClick={onUnschedule}>
                <IconCalendarCancel size={16} />
              </ActionIcon>
            )}
          </Group>
        </Group>
      </Box>
    </>
  );
}

export interface SubmissionsListProps {
  submissions: SubmissionDto[];
  queueRecords: IPostQueueRecord[];
  currentlyPosting?: PostRecordDto;
  onRefresh: () => void;
}

export function SubmissionsList({
  submissions,
  queueRecords,
  currentlyPosting,
  onRefresh,
}: SubmissionsListProps) {
  const submissionData: SubmissionData[] = useMemo(
    () =>
      submissions.map((submission) => {
        // Check if submission is in queue
        const queueRecord = queueRecords.find(
          (q) => q.submissionId === submission.id,
        );
        const isQueued = !!queueRecord;
        const isPosting = currentlyPosting?.submissionId === submission.id;

        // Get title and thumbnail if available
        // eslint-disable-next-line lingui/no-unlocalized-strings
        const title = submission.getDefaultOptions()?.data?.title || 'Untitled';

        // Get thumbnail URL if there are files
        let thumbnailUrl;
        if (submission.files && submission.files.length > 0) {
          thumbnailUrl = `${defaultTargetProvider()}/api/file/thumbnail/${submission.files[0].id}`;
        }

        return {
          id: submission.id,
          title,
          isQueued,
          isPosting,
          isScheduled: submission.isScheduled,
          scheduledFor: submission.schedule?.scheduledFor,
          thumbnailUrl,
        };
      }),
    [submissions, queueRecords, currentlyPosting],
  );

  const queuedSubmissions = useMemo(
    () => submissionData.filter((s) => s.isQueued),
    [submissionData],
  );

  const scheduledSubmissions = useMemo(
    () => submissionData.filter((s) => s.isScheduled && !s.isQueued),
    [submissionData],
  );

  const cancelSubmission = async (submissionId: string) => {
    try {
      await postManagerApi.cancelIfRunning(submissionId);
      notifications.show({
        title: <Trans>Submission Cancelled</Trans>,
        message: <Trans>The submission has been cancelled</Trans>,
        color: 'green',
      });
      onRefresh();
    } catch (error) {
      notifications.show({
        title: <Trans>Error</Trans>,
        message: (error as Error).message,
        color: 'red',
      });
    }
  };

  const unqueueSubmission = async (submissionId: string) => {
    try {
      await postQueueApi.dequeue([submissionId]);
      notifications.show({
        title: <Trans>Submission Removed</Trans>,
        message: <Trans>The submission has been removed from the queue</Trans>,
        color: 'green',
      });
      onRefresh();
    } catch (error) {
      notifications.show({
        title: <Trans>Error</Trans>,
        message: (error as Error).message,
        color: 'red',
      });
    }
  };

  const unscheduleSubmission = async (submissionId: string) => {
    try {
      const submission = submissions.find((s) => s.id === submissionId);
      if (submission) {
        await submissionApi.update(submissionId, {
          scheduleType: submission.schedule.scheduleType,
          scheduledFor: submission.schedule.scheduledFor,
          cron: submission.schedule.cron,
          isScheduled: false,
          metadata: submission.metadata,
          newOrUpdatedOptions: [],
          deletedWebsiteOptions: [],
        });

        notifications.show({
          title: <Trans>Submission Unscheduled</Trans>,
          message: <Trans>The submission has been unscheduled</Trans>,
          color: 'green',
        });
        onRefresh();
      }
    } catch (error) {
      notifications.show({
        title: <Trans>Error</Trans>,
        message: (error as Error).message,
        color: 'red',
      });
    }
  };

  return (
    <Stack>
      {queuedSubmissions.length > 0 && (
        <Paper withBorder p="md" radius="md" shadow="sm">
          <Stack gap="xs">
            <Title order={4}>
              <Group align="apart">
                <span>
                  <Trans>Queue</Trans>
                </span>
                <Badge size="sm">{queuedSubmissions.length}</Badge>
              </Group>
            </Title>
            <ScrollArea style={{ height: 200 }}>
              <Stack gap={0}>
                {queuedSubmissions.map((submission) => (
                  <SubmissionItem
                    key={submission.id}
                    submission={submission}
                    onCancel={() => cancelSubmission(submission.id)}
                    onUnqueue={() => unqueueSubmission(submission.id)}
                    onUnschedule={() => unscheduleSubmission(submission.id)}
                  />
                ))}
              </Stack>
            </ScrollArea>
          </Stack>
        </Paper>
      )}

      {scheduledSubmissions.length > 0 && (
        <Paper withBorder p="md" radius="md" shadow="sm">
          <Stack gap="xs">
            <Title order={4}>
              <Group align="apart">
                <span>
                  <Trans>Scheduled</Trans>
                </span>
                <Badge size="sm">{scheduledSubmissions.length}</Badge>
              </Group>
            </Title>
            <ScrollArea style={{ height: 200 }}>
              <Stack gap={0}>
                {scheduledSubmissions.map((submission) => (
                  <SubmissionItem
                    key={submission.id}
                    submission={submission}
                    onCancel={() => {}}
                    onUnqueue={() => {}}
                    onUnschedule={() => unscheduleSubmission(submission.id)}
                  />
                ))}
              </Stack>
            </ScrollArea>
          </Stack>
        </Paper>
      )}

      {queuedSubmissions.length === 0 && scheduledSubmissions.length === 0 && (
        <Paper withBorder p="md" radius="md" shadow="sm">
          <Text ta="center" c="dimmed">
            <Trans>No submissions in queue or scheduled</Trans>
          </Text>
        </Paper>
      )}
    </Stack>
  );
}
