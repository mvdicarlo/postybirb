import { Draggable } from '@fullcalendar/interaction';
import { Trans } from '@lingui/react/macro';
import {
  Avatar,
  Badge,
  Box,
  Group,
  Paper,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { ScheduleType, SubmissionType } from '@postybirb/types';
import {
  IconCalendarOff,
  IconDragDrop,
  IconFileText,
} from '@tabler/icons-react';
import moment from 'moment';
import { useEffect, useRef } from 'react';
import { SubmissionDto } from '../../../models/dtos/submission.dto';
import { SubmissionStore } from '../../../stores/submission.store';
import { useStore } from '../../../stores/use-store';
import { CommonTranslations } from '../../../translations/common-translations';
import { defaultTargetProvider } from '../../../transports/http-client';
import '../submission-calendar/fullcalendar.css';
import { SubmissionCalendar } from '../submission-calendar/submission-calendar';

type SubmissionScheduleViewProps = { type: SubmissionType };

function SubmissionCard({ submission }: { submission: SubmissionDto }) {
  const dragRef = useRef(null);
  const title = submission.getDefaultOptions().data.title || (
    <CommonTranslations.Unknown />
  );
  const hasThumbnail = submission.files.length > 0;
  const createdAt = moment(submission.createdAt).fromNow();

  useEffect(() => {
    if (dragRef.current) {
      // Initialize the element as draggable for FullCalendar
      // eslint-disable-next-line no-new
      new Draggable(dragRef.current, {
        itemSelector: '.calendar-draggable',
        eventData(eventEl) {
          return {
            title: eventEl.getAttribute('data-submission-title'),
            id: eventEl.getAttribute('data-submission-id'),
            create: true,
          };
        },
      });
    }

    return () => {
      // Cleanup if needed
    };
  }, []);
  return (
    <Paper
      ref={dragRef}
      shadow="xs"
      p="md"
      withBorder
      className="submission-card-container"
    >
      <div
        className="calendar-draggable"
        data-submission-id={submission.id}
        data-submission-title={title.toString()}
      >
        <Group p="apart" align="flex-start" wrap="nowrap">
          {hasThumbnail ? (
            <Avatar
              src={`${defaultTargetProvider()}/api/file/thumbnail/${submission.files[0].id}`}
              size="lg"
              radius="md"
            />
          ) : (
            <Avatar size="lg" radius="md">
              <IconFileText size={24} />
            </Avatar>
          )}

          <Stack gap="xs" style={{ flex: 1 }}>
            <Title order={5} lineClamp={1}>
              {title}
            </Title>

            <Group p="apart" gap="xs">
              <Badge
                leftSection={<IconDragDrop size={14} />}
                color="blue"
                variant="light"
              >
                <Trans>Drag to schedule</Trans>
              </Badge>
            </Group>
          </Stack>
        </Group>
      </div>
    </Paper>
  );
}

function SubmissionCardList({ submissions }: { submissions: SubmissionDto[] }) {
  if (submissions.length === 0) {
    return (
      <Paper p="md" withBorder>
        <Text ta="center" c="dimmed">
          <CommonTranslations.NoItemsFound />
        </Text>
      </Paper>
    );
  }

  return (
    <Stack gap="md">
      <Title order={4}>
        <Group gap="xs">
          <IconCalendarOff size={20} />
          <Trans>Unscheduled Submissions</Trans>
          <Badge size="sm">{submissions.length}</Badge>
        </Group>
      </Title>
      <Box style={{ maxHeight: '500px', overflowY: 'auto' }}>
        <Stack gap="md">
          {submissions.map((submission) => (
            <SubmissionCard key={submission.id} submission={submission} />
          ))}
        </Stack>
      </Box>
    </Stack>
  );
}

export function SubmissionScheduleView(props: SubmissionScheduleViewProps) {
  const { type } = props;
  const { state: submissions } = useStore(SubmissionStore);
  const unscheduledSubmissions = submissions.filter(
    (submission) =>
      submission.type === type &&
      !submission.isArchived &&
      submission.schedule.scheduleType === ScheduleType.NONE,
  );

  return (
    <Stack gap="lg">
      <Group align="flex-start" gap="xl" grow>
        <Box style={{ width: '300px', flexShrink: 0, flexGrow: 0 }}>
          <SubmissionCardList submissions={unscheduledSubmissions} />
        </Box>

        <Box style={{ flexGrow: 1 }}>
          <SubmissionCalendar type={type} />
        </Box>
      </Group>
    </Stack>
  );
}
