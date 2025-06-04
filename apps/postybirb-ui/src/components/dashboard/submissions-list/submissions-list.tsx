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
  ThemeIcon,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IPostQueueRecord, PostRecordDto } from '@postybirb/types';
import { IconCalendar, IconCalendarCancel, IconClock, IconTrash, IconX } from '@tabler/icons-react';
import { format } from 'date-fns';
import { useMemo } from 'react';
import postManagerApi from '../../../api/post-manager.api';
import postQueueApi from '../../../api/post-queue.api';
import submissionApi from '../../../api/submission.api';
import { SubmissionDto } from '../../../models/dtos/submission.dto';
import { defaultTargetProvider } from '../../../transports/http-client';
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
      <Badge color="teal" variant="filled" radius="xl">
        <Trans>Posting</Trans>
      </Badge>
    );
    itemClass = styles.activePosting;
  } else if (submission.isQueued) {
    statusBadge = (
      <Badge color="blue" variant="filled" radius="xl">
        <Trans>Queued</Trans>
      </Badge>
    );
    itemClass = styles.queuedItem;
  } else if (submission.isScheduled) {
    statusBadge = (
      <Badge color="violet" variant="filled" radius="xl">
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
        centered
        radius="lg"
      >
        <Stack>
          <Text>
            <Trans>
              Are you sure you want to cancel this submission? The app is not
              responsible for any partial post clean-up.
            </Trans>
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={confirmModal.close} radius="xl">
              <Trans>Cancel</Trans>
            </Button>
            <Button
              color="red"
              onClick={() => {
                onCancel();
                confirmModal.close();
              }}
              radius="xl"
            >
              <Trans>Yes, Cancel Posting</Trans>
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Box className={`${styles.item} ${itemClass}`}>
        <Group justify="space-between" align="center">
          <Group>
            {submission.thumbnailUrl && (
              <Box className={styles.thumbnail}>
                <img
                  src={submission.thumbnailUrl}
                  alt={submission.title}
                  style={{
                    width: 56,
                    height: 56,
                    objectFit: 'cover',
                    display: 'block',
                  }}
                />
              </Box>
            )}
            <Box>
              <Text fw={600} size="sm" lineClamp={1}>
                {submission.title}
              </Text>
              <Group gap="sm" mt={4}>
                {statusBadge}
                {scheduledDate && (
                  <Text size="xs" c="dimmed">
                    {scheduledDate}
                  </Text>
                )}
              </Group>
            </Box>
          </Group>
          <Group gap="xs">
            {submission.isPosting && (
              <ActionIcon 
                color="red" 
                variant="light" 
                radius="xl" 
                onClick={confirmModal.open}
                size="lg"
              >
                <IconX size={18} />
              </ActionIcon>
            )}
            {submission.isQueued && !submission.isPosting && (
              <ActionIcon 
                color="orange" 
                variant="light" 
                radius="xl" 
                onClick={onUnqueue}
                size="lg"
              >
                <IconTrash size={18} />
              </ActionIcon>
            )}
            {submission.isScheduled && (
              <ActionIcon 
                color="violet" 
                variant="light" 
                radius="xl" 
                onClick={onUnschedule}
                size="lg"
              >
                <IconCalendarCancel size={18} />
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
}

export function SubmissionsList({
  submissions,
  queueRecords,
  currentlyPosting,
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
    <Stack gap="xl">
      {queuedSubmissions.length > 0 && (
        <Paper withBorder p="xl" radius="xl" shadow="md">
          <Stack gap="md">
            <Group justify="space-between" align="center">
              <Group>
                <ThemeIcon size="lg" radius="xl" variant="light" color="blue">
                  <IconClock size={20} />
                </ThemeIcon>
                <Title order={4}>
                  <Trans>Queue</Trans>
                </Title>
              </Group>
              <Badge size="lg" variant="filled" radius="xl" color="blue">
                {queuedSubmissions.length}
              </Badge>
            </Group>
            <ScrollArea style={{ height: 240 }}>
              <Stack gap="sm">
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
        <Paper withBorder p="xl" radius="xl" shadow="md">
          <Stack gap="md">
            <Group justify="space-between" align="center">
              <Group>
                <ThemeIcon size="lg" radius="xl" variant="light" color="violet">
                  <IconCalendar size={20} />
                </ThemeIcon>
                <Title order={4}>
                  <Trans>Scheduled</Trans>
                </Title>
              </Group>
              <Badge size="lg" variant="filled" radius="xl" color="violet">
                {scheduledSubmissions.length}
              </Badge>
            </Group>
            <ScrollArea style={{ height: 240 }}>
              <Stack gap="sm">
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
        <Paper withBorder p="xl" radius="xl" shadow="md">
          <Stack align="center" gap="lg">
            <ThemeIcon size="xl" radius="xl" variant="light" color="gray">
              <IconClock size={32} />
            </ThemeIcon>
            <Box ta="center">
              <Title order={4} c="dimmed">
                <Trans>No Active Submissions</Trans>
              </Title>
              <Text size="sm" c="dimmed" mt={4}>
                <Trans>No submissions in queue or scheduled</Trans>
              </Text>
            </Box>
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}
