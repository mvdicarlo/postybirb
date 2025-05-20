import { EventClickArg, EventDropArg } from '@fullcalendar/core';
import { EventImpl } from '@fullcalendar/core/internal';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin, { DropArg } from '@fullcalendar/interaction';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import { Trans } from '@lingui/macro';
import {
  Button,
  Group,
  Modal,
  Popover,
  Stack,
  Text,
  useMantineColorScheme,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { ScheduleType, SubmissionType } from '@postybirb/types';
import {
  IconCalendarOff,
  IconCalendarTime,
  IconCheck,
  IconX,
} from '@tabler/icons-react';
import Cron from 'croner';
import moment from 'moment';
import { useCallback, useRef, useState } from 'react';
import submissionApi from '../../../api/submission.api';
import { calendarLanguageMap } from '../../../app/languages';
import { use18n } from '../../../hooks/use-i18n';
import { SubmissionStore } from '../../../stores/submission.store';
import { useStore } from '../../../stores/use-store';
import './fullcalendar.css';

type SubmissionCalendarProps = {
  type: SubmissionType;
};

const DATE_FORMAT = 'YYYY-MM-DD HH:mm';

export function SubmissionCalendar(props: SubmissionCalendarProps) {
  const theme = useMantineColorScheme();
  const [lang] = use18n();
  const { type } = props;
  const { state: submissions } = useStore(SubmissionStore);
  const [selectedEvent, setSelectedEvent] = useState<EventImpl | null>(null);
  const [popoverOpened, setPopoverOpened] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });
  const [
    confirmModalOpened,
    { open: openConfirmModal, close: closeConfirmModal },
  ] = useDisclosure(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const calendarRef = useRef<any>(null);

  const filteredSubmissions = submissions.filter(
    (submission) => submission.type === type && !submission.isArchived,
  );

  // Format events for FullCalendar
  const events = filteredSubmissions.flatMap((submission) => {
    const result = [];
    const { title } = submission.getDefaultOptions().data;

    if (submission.schedule.cron) {
      // Add main scheduled event
      if (submission.schedule.scheduledFor) {
        result.push({
          id: submission.id,
          title,
          start: moment(submission.schedule.scheduledFor).toISOString(),
          backgroundColor: '#339af0',
          borderColor: '#339af0',
          textColor: '#ffffff',
        });
      }

      // Add future recurring events
      const cron = Cron(submission.schedule.cron);
      const nextRuns = cron.nextRuns(4);
      nextRuns.forEach((nextRun, index) => {
        result.push({
          id: `${submission.id}-${index}`,
          title,
          start: moment(nextRun).toISOString(),
          backgroundColor: '#74c0fc',
          borderColor: '#74c0fc',
          textColor: '#ffffff',
          extendedProps: { type: 'recurring' },
        });
      });
    } else if (submission.schedule.scheduledFor) {
      // Regular scheduled event
      result.push({
        id: submission.id,
        title,
        start: moment(submission.schedule.scheduledFor).toISOString(),
        backgroundColor: submission.isScheduled ? '#339af0' : '#909296',
        borderColor: submission.isScheduled ? '#339af0' : '#909296',
        textColor: '#ffffff',
        extendedProps: {
          type: submission.isScheduled ? 'scheduled' : 'unscheduled',
          isScheduled: submission.isScheduled,
        },
      });
    }

    return result;
  });

  // Handle event drop (for existing events)
  const handleEventDrop = (info: EventDropArg) => {
    const { event } = info;
    if (event.start) {
      submissionApi.update(event.id, {
        scheduledFor: event.start.toISOString(),
        scheduleType: ScheduleType.SINGLE,
      });
    }
  };

  // Handle external elements being dropped onto the calendar
  const handleExternalDrop = useCallback((dropInfo: DropArg) => {
    // Extract submission ID from the dragged element's data
    const submissionId = dropInfo.draggedEl.getAttribute('data-submission-id');

    if (!submissionId) return;

    // Create a date at the dropped date/time
    const dropDate = dropInfo.date;

    // Schedule the submission for this date
    submissionApi.update(submissionId, {
      scheduledFor: dropDate.toISOString(),
      scheduleType: ScheduleType.SINGLE,
      isScheduled: false, // Set scheduled flag to true automatically
    });
  }, []);

  // Handle event click
  const handleEventClick = useCallback((info: EventClickArg) => {
    // Set the selected event
    setSelectedEvent(info.event);

    // Get click coordinates relative to the page
    const rect = info.el.getBoundingClientRect();

    // Get calendar DOM element for reference
    const calendarElement = calendarRef.current?.elRef?.current;

    // Calculate position considering scroll
    if (calendarElement) {
      const calendarRect = calendarElement.getBoundingClientRect();

      setPopoverPosition({
        top: rect.bottom - calendarRect.top + calendarElement.scrollTop + 10,
        left: rect.left - calendarRect.left + calendarElement.scrollLeft,
      });

      // Show the popover
      setPopoverOpened(true);
    }
  }, []);

  // Handle unscheduling an event
  const handleUnschedule = () => {
    if (!selectedEvent) return;
    openConfirmModal();
  };

  // Confirm unscheduling
  const confirmUnschedule = () => {
    if (!selectedEvent) return;

    submissionApi
      .update(selectedEvent.id, {
        scheduledFor: undefined,
        scheduleType: ScheduleType.NONE,
        isScheduled: false,
      })
      .then(() => {
        notifications.show({
          title: <Trans>Submission Unscheduled</Trans>,
          message: selectedEvent.title,
          color: 'blue',
          icon: <IconCheck size={16} />,
        });
      })
      .catch((error) => {
        notifications.show({
          title: <Trans>Failed to Unschedule</Trans>,
          message: error.message,
          color: 'red',
          icon: <IconX size={16} />,
        });
      });

    closeConfirmModal();
    setPopoverOpened(false);
  };

  // Toggle scheduled state
  const toggleScheduledState = () => {
    if (!selectedEvent) return;

    const currentScheduledState =
      selectedEvent.extendedProps?.isScheduled || false;

    submissionApi
      .update(selectedEvent.id, {
        isScheduled: !currentScheduledState,
      })
      .then(() => {
        notifications.show({
          title: currentScheduledState ? (
            <Trans>Submission Scheduling Disabled</Trans>
          ) : (
            <Trans>Submission Scheduling Enabled</Trans>
          ),
          message: selectedEvent.title,
          color: 'green',
          icon: <IconCheck size={16} />,
        });
      })
      .catch((error) => {
        notifications.show({
          title: <Trans>Failed to Update</Trans>,
          message: error.message,
          color: 'red',
          icon: <IconX size={16} />,
        });
      });

    setPopoverOpened(false);
  };

  return (
    <div
      style={{ overflow: 'auto', position: 'relative' }}
      className={theme.colorScheme === 'dark' ? 'fc-dark-theme' : ''}
    >
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
        locale={calendarLanguageMap[lang] || 'en-US'}
        eventDrop={handleEventDrop}
        height="auto"
        themeSystem="standard"
        snapDuration="00:01:00"
        slotLabelInterval="00:60:00"
        // External draggable element settings
        droppable
        drop={handleExternalDrop}
        // Event click handler
        eventClick={handleEventClick}
      />

      <div
        className="calendar-popover-container"
        style={{
          position: 'absolute',
          top: popoverPosition.top,
          left: popoverPosition.left,
          display: popoverOpened ? 'block' : 'none',
          zIndex: 1000,
        }}
      >
        <Popover
          opened={popoverOpened}
          onClose={() => setPopoverOpened(false)}
          width={220}
          position="bottom"
          withArrow
          withinPortal={false}
          shadow="md"
        >
          <Popover.Target>
            <div style={{ width: 1, height: 1 }} />
          </Popover.Target>
          <Popover.Dropdown>
            <Stack gap="xs">
              <Text fw={500}>{selectedEvent?.title}</Text>
              <Text size="sm" c="dimmed">
                {selectedEvent?.start
                  ? moment(selectedEvent.start).format('lll')
                  : ''}
              </Text>

              <Group p="apart" mt="xs">
                <Button
                  variant="outline"
                  color="red"
                  size="xs"
                  leftSection={<IconCalendarOff size={16} />}
                  onClick={handleUnschedule}
                >
                  <Trans>Unschedule</Trans>
                </Button>

                <Button
                  variant={
                    selectedEvent?.extendedProps?.isScheduled
                      ? 'outline'
                      : 'filled'
                  }
                  color={
                    selectedEvent?.extendedProps?.isScheduled ? 'gray' : 'blue'
                  }
                  size="xs"
                  leftSection={<IconCalendarTime size={16} />}
                  onClick={toggleScheduledState}
                >
                  {selectedEvent?.extendedProps?.isScheduled ? (
                    <Trans>Disable</Trans>
                  ) : (
                    <Trans>Enable</Trans>
                  )}
                </Button>
              </Group>
            </Stack>
          </Popover.Dropdown>
        </Popover>
      </div>

      {/* Confirmation Modal */}
      <Modal
        opened={confirmModalOpened}
        onClose={closeConfirmModal}
        title={<Trans>Confirm Unschedule</Trans>}
        size="sm"
      >
        <Stack>
          <Text>
            <Trans>Are you sure you want to unschedule this submission?</Trans>
          </Text>
          <Text fw={500}>{selectedEvent?.title}</Text>

          <Group p="right" mt="md">
            <Button variant="outline" onClick={closeConfirmModal}>
              <Trans>Cancel</Trans>
            </Button>
            <Button color="red" onClick={confirmUnschedule}>
              <Trans>Unschedule</Trans>
            </Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  );
}
