/**
 * ScheduleCalendar - FullCalendar component for viewing and managing scheduled submissions.
 * Supports drag-drop from external elements, event moving, and click-to-manage.
 */

import { EventClickArg, EventDropArg } from '@fullcalendar/core';
import { EventImpl } from '@fullcalendar/core/internal';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin, { DropArg } from '@fullcalendar/interaction';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import { Trans } from '@lingui/react/macro';
import {
  Badge,
  Button,
  Divider,
  Group,
  Modal,
  Stack,
  Text,
  ThemeIcon,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { ScheduleType, SubmissionType } from '@postybirb/types';
import {
  IconCalendarOff,
  IconCalendarTime,
  IconCheck,
  IconClock,
  IconFile,
  IconMessage,
  IconX,
} from '@tabler/icons-react';
import Cron from 'croner';
import moment from 'moment';
import { useCallback, useMemo, useRef, useState } from 'react';
import submissionApi from '../../../api/submission.api';
import { useLocale } from '../../../hooks';
import { useSubmissions } from '../../../stores/submission-store';

/**
 * Calendar component for schedule drawer.
 * Shows all scheduled submissions (both FILE and MESSAGE types).
 */
export function ScheduleCalendar() {
  const { calendarLocale, formatRelativeTime, formatDateTime } = useLocale();
  const submissions = useSubmissions();
  const [selectedEvent, setSelectedEvent] = useState<EventImpl | null>(null);
  const [modalOpened, setModalOpened] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const calendarRef = useRef<any>(null);

  // Filter to submissions with a schedule (not archived, not templates)
  const scheduledSubmissions = useMemo(
    () =>
      submissions.filter(
        (s) =>
          !s.isArchived &&
          !s.isTemplate &&
          (s.schedule.scheduledFor || s.schedule.cron),
      ),
    [submissions],
  );

  // Format events for FullCalendar
  const events = useMemo(
    () =>
      scheduledSubmissions.flatMap((submission) => {
        const result = [];
        const { title } = submission;
        const isMessageType = submission.type === SubmissionType.MESSAGE;

        if (submission.schedule.cron) {
          // Add main scheduled event
          if (submission.schedule.scheduledFor) {
            result.push({
              id: submission.id,
              title,
              start: moment(submission.schedule.scheduledFor).toISOString(),
              backgroundColor: isMessageType ? '#40c057' : '#339af0',
              borderColor: isMessageType ? '#40c057' : '#339af0',
              textColor: '#ffffff',
              extendedProps: {
                type: 'scheduled',
                submissionType: submission.type,
                isScheduled: true,
              },
            });
          }

          // Add future recurring events
          const cron = Cron(submission.schedule.cron);
          const nextRuns = cron.nextRuns(4);
          nextRuns.forEach((nextRun, index) => {
            result.push({
              id: `${submission.id}-recurring-${index}`,
              title,
              start: moment(nextRun).toISOString(),
              backgroundColor: isMessageType ? '#69db7c' : '#74c0fc',
              borderColor: isMessageType ? '#69db7c' : '#74c0fc',
              textColor: '#ffffff',
              extendedProps: {
                type: 'recurring',
                submissionType: submission.type,
                parentId: submission.id,
              },
            });
          });
        } else if (submission.schedule.scheduledFor) {
          // Regular scheduled event
          result.push({
            id: submission.id,
            title,
            start: moment(submission.schedule.scheduledFor).toISOString(),
            backgroundColor: submission.isScheduled
              ? isMessageType
                ? '#40c057'
                : '#339af0'
              : '#909296',
            borderColor: submission.isScheduled
              ? isMessageType
                ? '#40c057'
                : '#339af0'
              : '#909296',
            textColor: '#ffffff',
            extendedProps: {
              type: submission.isScheduled ? 'scheduled' : 'unscheduled',
              submissionType: submission.type,
              isScheduled: submission.isScheduled,
            },
          });
        }

        return result;
      }),
    [scheduledSubmissions],
  );

  // Handle event drop (for existing events)
  const handleEventDrop = useCallback((info: EventDropArg) => {
    const { event } = info;
    // Skip recurring previews
    if (event.id.includes('-recurring-')) {
      info.revert();
      return;
    }
    if (event.start) {
      submissionApi.update(event.id, {
        scheduledFor: event.start.toISOString(),
        scheduleType: ScheduleType.SINGLE,
      });
    }
  }, []);

  // Handle external elements being dropped onto the calendar
  const handleExternalDrop = useCallback((dropInfo: DropArg) => {
    const submissionId = dropInfo.draggedEl.getAttribute('data-submission-id');

    if (!submissionId) return;

    const dropDate = dropInfo.date;

    submissionApi.update(submissionId, {
      scheduledFor: dropDate.toISOString(),
      scheduleType: ScheduleType.SINGLE,
      isScheduled: false,
    });
  }, []);

  // Handle event click
  const handleEventClick = useCallback((info: EventClickArg) => {
    // Skip recurring previews
    if (info.event.id.includes('-recurring-')) {
      return;
    }
    setSelectedEvent(info.event);
    setModalOpened(true);
  }, []);

  const handleUnschedule = () => {
    if (!selectedEvent) return;

    submissionApi
      .update(selectedEvent.id, {
        scheduledFor: undefined,
        scheduleType: ScheduleType.NONE,
        isScheduled: false,
      })
      .then(() => {
        notifications.show({
          title: <Trans>Submission unscheduled</Trans>,
          message: selectedEvent.title,
          color: 'blue',
          icon: <IconCheck size={16} />,
        });
      })
      .catch((error) => {
        notifications.show({
          title: <Trans>Failed to update</Trans>,
          message: error.message,
          color: 'red',
          icon: <IconX size={16} />,
        });
      });

    setModalOpened(false);
  };

  const toggleScheduledState = () => {
    if (!selectedEvent) return;

    const currentScheduledState =
      selectedEvent.extendedProps?.isScheduled || false;

    submissionApi
      .update(selectedEvent.id, { isScheduled: !currentScheduledState })
      .then(() => {
        notifications.show({
          title: <Trans>Schedule updated</Trans>,
          message: selectedEvent.title,
          color: 'green',
          icon: <IconCheck size={16} />,
        });
      })
      .catch((error) => {
        notifications.show({
          title: <Trans>Failed to update</Trans>,
          message: error.message,
          color: 'red',
          icon: <IconX size={16} />,
        });
      });

    setModalOpened(false);
  };

  return (
    <div style={{ overflow: 'auto', position: 'relative', height: '100%' }}>
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        headerToolbar={{
          // eslint-disable-next-line lingui/no-unlocalized-strings
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay',
        }}
        initialView="dayGridMonth"
        editable
        selectable
        selectMirror
        dayMaxEvents
        allDaySlot={false}
        weekends
        events={events}
        locale={calendarLocale}
        eventDrop={handleEventDrop}
        height="100%"
        themeSystem="standard"
        snapDuration="00:01:00"
        slotLabelInterval="00:60:00"
        droppable
        drop={handleExternalDrop}
        eventClick={handleEventClick}
      />

      {/* Event details modal */}
      <Modal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        title={selectedEvent?.title}
        centered
        size="sm"
        zIndex={2000}
      >
        <Stack gap="md">
          {/* Schedule time info */}
          <Group gap="xs" align="center">
            <ThemeIcon size="sm" variant="light" color="blue">
              <IconClock size={14} />
            </ThemeIcon>
            <Text size="sm" c="dimmed">
              {selectedEvent?.start
                ? formatDateTime(selectedEvent.start)
                : ''}
            </Text>
          </Group>
          {selectedEvent?.start && (
            <Text size="xs" c="dimmed">
              {formatRelativeTime(selectedEvent.start)}
            </Text>
          )}

          {/* Status badges */}
          <Group gap="xs">
            {/* Submission type badge */}
            {selectedEvent?.extendedProps?.submissionType && (
              <Badge
                size="sm"
                variant="light"
                color={
                  selectedEvent.extendedProps.submissionType ===
                  SubmissionType.MESSAGE
                    ? 'green'
                    : 'blue'
                }
                leftSection={
                  selectedEvent.extendedProps.submissionType ===
                  SubmissionType.MESSAGE ? (
                    <IconMessage size={12} />
                  ) : (
                    <IconFile size={12} />
                  )
                }
              >
                {selectedEvent.extendedProps.submissionType ===
                SubmissionType.MESSAGE ? (
                  <Trans>Message</Trans>
                ) : (
                  <Trans>File</Trans>
                )}
              </Badge>
            )}
            {selectedEvent?.extendedProps?.type === 'recurring' && (
              <Badge size="sm" variant="light" color="cyan">
                <Trans>Recurring</Trans>
              </Badge>
            )}
            {selectedEvent?.extendedProps?.isScheduled !== undefined && (
              <Badge
                size="sm"
                variant="light"
                color={
                  selectedEvent.extendedProps.isScheduled ? 'green' : 'orange'
                }
              >
                {selectedEvent.extendedProps.isScheduled ? (
                  <Trans>Active</Trans>
                ) : (
                  <Trans>Paused</Trans>
                )}
              </Badge>
            )}
          </Group>

          <Divider />

          {/* Action buttons */}
          <Group gap="xs">
            <Button
              variant="light"
              color="red"
              size="sm"
              leftSection={<IconCalendarOff size={16} />}
              onClick={handleUnschedule}
              flex={1}
            >
              <Trans>Unschedule</Trans>
            </Button>

            <Button
              variant={
                selectedEvent?.extendedProps?.isScheduled ? 'light' : 'filled'
              }
              color={
                selectedEvent?.extendedProps?.isScheduled ? 'orange' : 'green'
              }
              size="sm"
              leftSection={<IconCalendarTime size={16} />}
              onClick={toggleScheduledState}
              flex={1}
            >
              {selectedEvent?.extendedProps?.isScheduled ? (
                <Trans>Pause</Trans>
              ) : (
                <Trans>Activate</Trans>
              )}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  );
}
