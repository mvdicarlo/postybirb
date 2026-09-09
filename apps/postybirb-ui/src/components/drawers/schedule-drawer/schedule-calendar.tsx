/**
 * ScheduleCalendar - FullCalendar component for viewing and managing scheduled submissions.
 * Supports drag-drop from external elements, event moving, and click-to-manage.
 */

import { EventContentArg, EventDropArg, LocaleInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin, { DropArg } from '@fullcalendar/interaction';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import {
    ActionIcon,
    Button,
    Group,
    Popover,
    SegmentedControl,
    Text,
    Tooltip,
} from '@mantine/core';
import { DatePicker, DayOfWeek } from '@mantine/dates';
import { SubmissionType } from '@postybirb/types';
import {
    IconCalendar,
    IconChevronDown,
    IconChevronLeft,
    IconChevronRight,
    IconFile,
    IconLayoutSidebarLeftCollapse,
    IconLayoutSidebarLeftExpand,
    IconMessage,
    IconPlayerPause,
    IconPlus,
    IconRepeat,
} from '@tabler/icons-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import submissionApi from '../../../api/submission.api';
import { useLocale } from '../../../hooks';
import { useSubmissionsWithSchedule } from '../../../stores/entity/submission-store';
import {
    showScheduleUpdatedNotification,
    showUpdateErrorNotification,
} from '../../../utils/notifications';
import { ScheduleRequest } from './schedule-editor-modal';
import { buildScheduleEvents } from './schedule-utils';

function renderCalendarEvent(info: EventContentArg) {
  return (
    <div className="schedule-event-content">
      <span className="schedule-event-icon">
        {!info.event.extendedProps.isScheduled ? (
          <IconPlayerPause size={12} />
        ) : info.event.extendedProps.recurring ? (
          <IconRepeat size={12} />
        ) : info.event.extendedProps.submissionType ===
          SubmissionType.MESSAGE ? (
          <IconMessage size={12} />
        ) : (
          <IconFile size={12} />
        )}
      </span>
      {info.timeText && (
        <span className="schedule-event-time">{info.timeText}</span>
      )}
      <span className="schedule-event-title">{info.event.title}</span>
    </div>
  );
}

/**
 * Calendar component for schedule drawer.
 * Shows all scheduled submissions (both FILE and MESSAGE types).
 */
export function ScheduleCalendar({
  onSchedule,
  queueOpen,
  onToggleQueue,
}: {
  onSchedule: (request: ScheduleRequest) => void;
  queueOpen: boolean;
  onToggleQueue: () => void;
}) {
  const { calendarLocale, locale, startOfWeek, hourCycle } = useLocale();
  const submissions = useSubmissionsWithSchedule();
  const calendarRef = useRef<FullCalendar>(null);
  const [title, setTitle] = useState('');
  const [initialView] = useState(() =>
    window.innerWidth < 600 ? 'timeGridDay' : 'dayGridMonth',
  );
  const [view, setView] = useState(initialView);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const untitled = t`Untitled Submission`;
  const events = useMemo(
    () => buildScheduleEvents(submissions, untitled),
    [submissions, untitled],
  );
  useEffect(() => {
    calendarRef.current?.getApi().updateSize();
  }, [queueOpen]);

  const handleEventDrop = async (info: EventDropArg) => {
    if (info.event.extendedProps.preview || !info.event.start) {
      info.revert();
      return;
    }
    if (
      info.event.extendedProps.isScheduled &&
      info.event.start.getTime() <= Date.now()
    ) {
      info.revert();
      showUpdateErrorNotification(t`Date is in the past`);
      return;
    }
    try {
      await submissionApi.update(info.event.id, {
        scheduledFor: info.event.start.toISOString(),
      });
      showScheduleUpdatedNotification(info.event.title);
    } catch (error) {
      info.revert();
      showUpdateErrorNotification(
        error instanceof Error ? error.message : undefined,
      );
    }
  };
  const handleExternalDrop = (info: DropArg) => {
    const submissionId = info.draggedEl.getAttribute('data-submission-id');
    if (submissionId)
      onSchedule({ submissionId, date: info.date, allDay: info.allDay });
  };
  const timeFormat = {
    hour: 'numeric',
    minute: '2-digit',
    hour12: hourCycle === 'h12',
  } as const;

  return (
    <div className="schedule-calendar-layout">
      <div className="schedule-calendar-toolbar">
        <Group gap="xs" wrap="nowrap" className="schedule-calendar-navigation">
          <Tooltip label={<Trans>Unscheduled Submissions</Trans>}>
            <ActionIcon
              variant="default"
              size="md"
              aria-label={t`Unscheduled Submissions`}
              aria-expanded={queueOpen}
              onClick={onToggleQueue}
            >
              {queueOpen ? (
                <IconLayoutSidebarLeftCollapse size={18} />
              ) : (
                <IconLayoutSidebarLeftExpand size={18} />
              )}
            </ActionIcon>
          </Tooltip>
          <Button
            variant="default"
            size="xs"
            onClick={() => calendarRef.current?.getApi().today()}
          >
            <Trans>Today</Trans>
          </Button>
          <ActionIcon.Group>
            <Tooltip label={<Trans>Previous</Trans>}>
              <ActionIcon
                variant="subtle"
                color="gray"
                size="md"
                aria-label={t`Previous`}
                onClick={() => calendarRef.current?.getApi().prev()}
              >
                <IconChevronLeft size={18} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label={<Trans>Next</Trans>}>
              <ActionIcon
                variant="subtle"
                color="gray"
                size="md"
                aria-label={t`Next`}
                onClick={() => calendarRef.current?.getApi().next()}
              >
                <IconChevronRight size={18} />
              </ActionIcon>
            </Tooltip>
          </ActionIcon.Group>
          <Popover
            opened={datePickerOpen}
            onChange={setDatePickerOpen}
            position="bottom-start"
            withinPortal={false}
          >
            <Popover.Target>
              <Button
                variant="subtle"
                color="gray"
                className="schedule-calendar-title"
                rightSection={<IconChevronDown size={14} />}
                onClick={() => setDatePickerOpen((opened) => !opened)}
              >
                {title}
              </Button>
            </Popover.Target>
            <Popover.Dropdown>
              <DatePicker
                locale={locale}
                firstDayOfWeek={startOfWeek as DayOfWeek}
                value={currentDate}
                defaultDate={currentDate}
                onChange={(date) => {
                  if (date) {
                    calendarRef.current?.getApi().gotoDate(date);
                    setDatePickerOpen(false);
                  }
                }}
              />
            </Popover.Dropdown>
          </Popover>
        </Group>
        <Group
          gap="sm"
          wrap="nowrap"
          className="schedule-calendar-view-controls"
        >
          <SegmentedControl
            size="xs"
            value={view}
            aria-label={t`Calendar view`}
            onChange={(nextView) =>
              calendarRef.current?.getApi().changeView(nextView)
            }
            data={[
              { value: 'dayGridMonth', label: t`Month` },
              { value: 'timeGridWeek', label: t`Week` },
              { value: 'timeGridDay', label: t`Day` },
            ]}
          />
          <Button
            size="xs"
            leftSection={<IconPlus size={15} />}
            onClick={() => onSchedule({})}
          >
            <Trans>Schedule</Trans>
          </Button>
        </Group>
      </div>
      <div className="schedule-calendar-meta">
        <Group gap="md" className="schedule-calendar-legend">
          <span>
            <i className="schedule-legend-file" />
            <Trans>File</Trans>
          </span>
          <span>
            <i className="schedule-legend-message" />
            <Trans>Message</Trans>
          </span>
          <span>
            <IconPlayerPause size={12} />
            <Trans>Paused</Trans>
          </span>
          <span>
            <IconRepeat size={12} />
            <Trans>Recurring</Trans>
          </span>
        </Group>
        <Text size="xs" c="dimmed" className="schedule-timezone">
          <IconCalendar size={13} />
          {Intl.DateTimeFormat().resolvedOptions().timeZone}
        </Text>
      </div>
      <div className="schedule-calendar-grid">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          headerToolbar={false}
          initialView={initialView}
          editable
          dayMaxEvents={3}
          allDaySlot={false}
          // fixes issue with offset on drag
          fixedMirrorParent={document.body}
          weekends
          events={events}
          locale={calendarLocale as LocaleInput}
          firstDay={startOfWeek}
          eventTimeFormat={timeFormat}
          eventDrop={handleEventDrop}
          height="100%"
          themeSystem="standard"
          snapDuration="00:15:00"
          slotLabelInterval="01:00:00"
          scrollTime="08:00:00"
          dayHeaderFormat={{ weekday: 'short' }}
          views={{
            timeGridWeek: {
              dayHeaderFormat: { weekday: 'short', day: 'numeric' },
            },
            timeGridDay: {
              dayHeaderFormat: { weekday: 'long', day: 'numeric' },
            },
          }}
          nowIndicator
          eventDurationEditable={false}
          slotLabelFormat={timeFormat}
          droppable
          drop={handleExternalDrop}
          eventDisplay="block"
          eventInteractive
          eventOrder="start,title"
          navLinks
          datesSet={(info) => {
            setTitle(info.view.title);
            setView(info.view.type);
            setCurrentDate(info.view.calendar.getDate());
          }}
          dateClick={(info) =>
            onSchedule({ date: info.date, allDay: info.allDay })
          }
          eventClick={(info) =>
            onSchedule({ submissionId: info.event.extendedProps.submissionId })
          }
          eventDidMount={(info) => {
            const status = info.event.extendedProps.isScheduled
              ? t`Active`
              : t`Paused`;
            const label = `${info.event.title} - ${status}`;
            info.el.setAttribute('title', label);
            info.el.setAttribute('aria-label', label);
          }}
          eventContent={renderCalendarEvent}
        />
      </div>
    </div>
  );
}
