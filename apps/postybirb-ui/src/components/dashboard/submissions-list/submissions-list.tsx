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
  ThemeIcon,
  Title,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IPostQueueRecord,
  PostRecordDto,
  SubmissionType,
} from '@postybirb/types';
import {
  IconCalendar,
  IconCalendarCancel,
  IconClock,
  IconTrash,
  IconX,
} from '@tabler/icons-react';
import { format } from 'date-fns';
import { useMemo } from 'react';
import postManagerApi from '../../../api/post-manager.api';
import postQueueApi from '../../../api/post-queue.api';
import submissionApi from '../../../api/submission.api';
import { SubmissionDto } from '../../../models/dtos/submission.dto';
import { defaultTargetProvider } from '../../../transports/http-client';
import { SubmissionCalendar } from '../../submissions/submission-calendar/submission-calendar';
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
      {' '}
      <Modal
        opened={confirmModalOpened}
        onClose={confirmModal.close}
        title={<Trans>Confirm Cancellation</Trans>}
        centered
        radius="md"
      >
        <Stack>
          <Text>
            <Trans>
              Are you sure you want to cancel this submission? The app is not
              responsible for any partial post clean-up.
            </Trans>
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={confirmModal.close} radius="md">
              <Trans>Cancel</Trans>
            </Button>
            <Button
              color="red"
              onClick={() => {
                onCancel();
                confirmModal.close();
              }}
              radius="md"
            >
              <Trans>Yes, Cancel Posting</Trans>
            </Button>
          </Group>
        </Stack>
      </Modal>
      <Box className={`${styles.item} ${itemClass}`}>
        <Group justify="space-between" align="center" wrap="nowrap">
          <Group gap="md" style={{ flex: 1, minWidth: 0 }}>
            {submission.thumbnailUrl && (
              <Box className={styles.thumbnail}>
                <img
                  src={submission.thumbnailUrl}
                  alt={submission.title}
                  style={{
                    width: 48,
                    height: 48,
                    objectFit: 'cover',
                    display: 'block',
                  }}
                />
              </Box>
            )}
            <Box style={{ flex: 1, minWidth: 0 }}>
              <Text
                fw={500}
                size="sm"
                lineClamp={1}
                style={{ marginBottom: 4 }}
              >
                {submission.title}
              </Text>
              <Group gap="sm" align="center">
                {statusBadge}
                {scheduledDate && (
                  <Text size="xs" c="dimmed">
                    {scheduledDate}
                  </Text>
                )}
              </Group>
            </Box>
          </Group>
          <Group gap="xs" style={{ flexShrink: 0 }}>
            {' '}
            {submission.isPosting && (
              <ActionIcon
                color="red"
                variant="light"
                radius="md"
                onClick={confirmModal.open}
                size="md"
              >
                <IconX size={16} />
              </ActionIcon>
            )}
            {submission.isQueued && !submission.isPosting && (
              <ActionIcon
                color="orange"
                variant="light"
                radius="md"
                onClick={onUnqueue}
                size="md"
              >
                <IconTrash size={16} />
              </ActionIcon>
            )}
            {submission.isScheduled && (
              <ActionIcon
                color="violet"
                variant="light"
                radius="md"
                onClick={onUnschedule}
                size="md"
              >
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

  // Determine the most common submission type for the calendar
  const scheduledSubmissionTypes = useMemo(() => {
    const types = submissions
      .filter(
        (s) =>
          s.isScheduled && !queueRecords.some((q) => q.submissionId === s.id),
      )
      .map((s) => s.type);

    const fileCount = types.filter((t) => t === SubmissionType.FILE).length;
    const messageCount = types.filter(
      (t) => t === SubmissionType.MESSAGE,
    ).length;

    // Default to FILE type if there's a tie or no submissions
    return fileCount >= messageCount
      ? SubmissionType.FILE
      : SubmissionType.MESSAGE;
  }, [submissions, queueRecords]);

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
    <Stack gap="lg">
      {queuedSubmissions.length > 0 && (
        <Paper withBorder p="lg" radius="md" shadow="sm">
          <Stack gap="md">
            <Group justify="space-between" align="center">
              <Group gap="sm">
                <ThemeIcon size="md" radius="md" variant="light" color="blue">
                  <IconClock size={16} />
                </ThemeIcon>
                <Title order={4} fw={500}>
                  <Trans>Queue</Trans>
                </Title>
              </Group>
              <Badge size="md" variant="filled" radius="md" color="blue">
                {queuedSubmissions.length}
              </Badge>
            </Group>
            <ScrollArea style={{ height: 280 }}>
              <Stack gap="xs">
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
      )}{' '}
      {scheduledSubmissions.length > 0 && (
        <Paper withBorder p="lg" radius="md" shadow="sm">
          <Stack gap="md">
            {' '}
            <Group justify="space-between" align="center">
              <Group gap="sm">
                <ThemeIcon size="md" radius="md" variant="light" color="violet">
                  <IconCalendar size={16} />
                </ThemeIcon>
                <Title order={4} fw={500}>
                  <Trans>Scheduled</Trans>
                </Title>
              </Group>
              <Badge size="md" variant="filled" radius="md" color="violet">
                {scheduledSubmissions.length}
              </Badge>
            </Group>
            <SubmissionCalendar type={scheduledSubmissionTypes} />
          </Stack>
        </Paper>
      )}
      {queuedSubmissions.length === 0 && scheduledSubmissions.length === 0 && (
        <Paper withBorder p="xl" radius="md" shadow="sm">
          <Stack align="center" gap="md">
            <ThemeIcon size="xl" radius="md" variant="light" color="gray">
              <IconClock size={24} />
            </ThemeIcon>
            <Box ta="center">
              <Title order={4} c="dimmed" fw={500}>
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
