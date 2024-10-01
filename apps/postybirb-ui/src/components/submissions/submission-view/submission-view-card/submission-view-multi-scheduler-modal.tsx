import { Trans } from '@lingui/macro';
import {
  Box,
  Button,
  Checkbox,
  Group,
  Modal,
  NumberInput,
  Paper,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocalStorage } from 'react-use';
import Sortable from 'sortablejs';
import { draggableIndexesAreDefined } from '../../../../helpers/sortable.helper';
import { SubmissionDto } from '../../../../models/dtos/submission.dto';
import { ScheduleGlobalKey } from '../../submission-scheduler/submission-scheduler';
import './submission-view-multi-scheduler-modal.css';

type SubmissionViewActionsProps = {
  onClose: () => void;
  onApply: (
    schedules: { submission: SubmissionDto; date: Date }[],
    isScheduled: boolean
  ) => void;
  submissions: SubmissionDto[];
};

function getIncrement(index: number, value: number, isLargest: boolean) {
  return isLargest ? value * index : value;
}

function getNextDate(
  date: Date,
  index: number,
  increments: {
    days: number;
    hours: number;
    minutes: number;
  }
): Date {
  const { days, hours, minutes } = increments;
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + getIncrement(index, days, days > 0));
  nextDate.setHours(
    nextDate.getHours() + getIncrement(index, hours, days === 0 && hours > 0)
  );
  nextDate.setMinutes(
    nextDate.getMinutes() +
      getIncrement(index, minutes, days === 0 && hours === 0 && minutes > 0)
  );
  return nextDate;
}

function ScheduleDisplay(
  props: Pick<SubmissionViewActionsProps, 'submissions'> & {
    selectedDate: Date | null;
    days: number;
    hours: number;
    minutes: number;
    onSort(submissions: SubmissionDto[]): void;
  }
) {
  const ref = useRef<HTMLDivElement>(null);
  const { submissions, selectedDate, days, minutes, hours, onSort } = props;
  useEffect(() => {
    const el = ref.current;
    if (!el) {
      // eslint-disable-next-line lingui/no-unlocalized-strings, no-console
      console.warn('Could not find multi-schedule-stack element');
      return () => {};
    }
    const sortable = new Sortable(el, {
      draggable: '.sortable-option',
      direction: 'vertical',
      onEnd: (event) => {
        if (draggableIndexesAreDefined(event)) {
          const newOrderedSubmissions = [...submissions];
          const [movedSubmission] = newOrderedSubmissions.splice(
            event.oldDraggableIndex,
            1
          );
          newOrderedSubmissions.splice(
            event.newDraggableIndex,
            0,
            movedSubmission
          );
          onSort(newOrderedSubmissions);
        }
      },
    });
    return () => {
      try {
        sortable.destroy();
      } catch (e) {
        // eslint-disable-next-line no-console, lingui/no-unlocalized-strings
        console.error('Failed to destroy sortable', e);
      }
    };
  }, [onSort, ref, submissions]);

  return (
    <>
      <Text fs="italic">
        <Trans>Drag or use arrow keys to change order.</Trans>
      </Text>

      <Stack id="multi-schedule-stack" ref={ref}>
        {submissions.map((submission, index) => (
          <Paper
            tabIndex={0}
            key={submission.id}
            className="sortable-option"
            shadow="xs"
            withBorder
            style={{ cursor: 'grab' }}
            p="xs"
            onKeyUpCapture={(event) => {
              if (event.key === 'ArrowUp') {
                event.preventDefault();
                const newIndex = Math.max(0, index - 1);
                const newOrderedSubmissions = [...submissions];
                newOrderedSubmissions.splice(index, 1);
                newOrderedSubmissions.splice(newIndex, 0, submission);
                onSort(newOrderedSubmissions);
              } else if (event.key === 'ArrowDown') {
                event.preventDefault();
                const newIndex = Math.min(submissions.length - 1, index + 1);
                const newOrderedSubmissions = [...submissions];
                newOrderedSubmissions.splice(index, 1);
                newOrderedSubmissions.splice(newIndex, 0, submission);
                onSort(newOrderedSubmissions);
              }
            }}
          >
            {submission.getDefaultOptions().data.title} @{' '}
            {getNextDate(selectedDate ?? new Date(), index, {
              days,
              hours,
              minutes,
            }).toLocaleString()}
          </Paper>
        ))}
      </Stack>
    </>
  );
}

// TODO - Use grid styling to allow scrollable center area and have buttons at the bottom be fixed
export function SubmissionViewMultiSchedulerModal(
  props: SubmissionViewActionsProps
) {
  const { onClose, onApply, submissions } = props;
  const [onlySetScheduledDate, setOnlySetScheduledDate] = useState(false);
  const [lastUsedSchedule, setLastUsedSchedule] = useLocalStorage<
    Date | undefined
  >(ScheduleGlobalKey, new Date(), {
    raw: false,
    deserializer: (value) => new Date(value),
    serializer: (value) => value?.toISOString() ?? new Date().toISOString(),
  });
  const [sortedSubmissions, setSortedSubmissions] = useState(submissions);
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    lastUsedSchedule ? new Date(lastUsedSchedule) : new Date()
  );
  const [days, setDays] = useState(1);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);

  const isValid = hours > 0 || minutes > 0 || days > 0;
  const submit = useCallback(() => {
    if (!isValid) return;
    onApply(
      sortedSubmissions.map((s, i) => ({
        submission: s,
        date: getNextDate(selectedDate ?? new Date(), i, {
          days,
          hours,
          minutes,
        }),
      })),
      !onlySetScheduledDate
    );
  }, [
    days,
    hours,
    isValid,
    minutes,
    onApply,
    onlySetScheduledDate,
    selectedDate,
    sortedSubmissions,
  ]);

  return (
    <Modal
      opened
      onClose={onClose}
      title={
        <Title order={4}>
          <Trans context="schedule.modal-header">Schedule</Trans>
        </Title>
      }
      onKeyUpCapture={(event) => {
        if (event.key === 'Enter') {
          submit();
        }
      }}
    >
      <Box className="multi-scheduler-grid-container">
        <Box className="main-content">
          <DateTimePicker
            required
            clearable
            label={<Trans>Date</Trans>}
            value={selectedDate}
            onChange={(date) => {
              setSelectedDate(date);
              if (date) {
                setLastUsedSchedule(date);
              }
            }}
          />

          <NumberInput
            label={<Trans>Days</Trans>}
            value={days}
            min={0}
            step={1}
            onChange={(value) => setDays(Number(value) || 0)}
          />

          <NumberInput
            label={<Trans>Hours</Trans>}
            value={hours}
            min={0}
            step={1}
            onChange={(value) => setHours(Number(value) || 0)}
          />

          <NumberInput
            label={<Trans>Minutes</Trans>}
            value={minutes}
            min={0}
            step={1}
            onChange={(value) => setMinutes(Number(value) || 0)}
          />

          <ScheduleDisplay
            submissions={sortedSubmissions}
            selectedDate={selectedDate}
            days={days}
            minutes={minutes}
            hours={hours}
            onSort={(s) => setSortedSubmissions(s)}
          />
        </Box>

        <Group justify="end" className="footer">
          <Checkbox
            checked={onlySetScheduledDate}
            onChange={(event) => {
              setOnlySetScheduledDate(event.currentTarget.checked);
            }}
            label={<Trans>Only set scheduled date</Trans>}
          />
          <Button
            variant="subtle"
            c="var(--mantine-color-text)"
            onClick={onClose}
          >
            <Trans>Cancel</Trans>
          </Button>
          <Button disabled={!isValid} onClick={submit}>
            <Trans>Apply</Trans>
          </Button>
        </Group>
      </Box>
    </Modal>
  );
}
