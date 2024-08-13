import { Trans } from '@lingui/macro';
import {
  Button,
  Group,
  Modal,
  NumberInput,
  Paper,
  Stack,
  Title,
} from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import { useEffect, useRef, useState } from 'react';
import { useLocalStorage } from 'react-use';
import Sortable from 'sortablejs';
import { SubmissionDto } from '../../../../models/dtos/submission.dto';
import { ScheduleGlobalKey } from '../../submission-scheduler/submission-scheduler';

type SubmissionViewActionsProps = {
  onClose: () => void;
  onApply: (schedules: { submission: SubmissionDto; date: Date }[]) => void;
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

// TODO - allow for reordering of submissions
// TODO - allow for image preview of submissions
export function SubmissionViewMultiSchedulerModal(
  props: SubmissionViewActionsProps
) {
  const { onClose, onApply, submissions } = props;
  const [lastUsedSchedule, setLastUsedSchedule] = useLocalStorage<
    Date | undefined
  >(ScheduleGlobalKey, new Date(), {
    raw: false,
    deserializer: (value) => new Date(value),
    serializer: (value) => value?.toISOString() ?? new Date().toISOString(),
  });
  const stackRef = useRef<HTMLDivElement>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    lastUsedSchedule ? new Date(lastUsedSchedule) : new Date()
  );
  const [days, setDays] = useState(1);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);

  useEffect(() => {
    // TODO - may need to be a sub-component for better performance
    const el = document.getElementById('multi-schedule-stack');
    if (!el) {
      // eslint-disable-next-line lingui/no-unlocalized-strings, no-console
      console.warn('Could not find multi-schedule-stack element');
      return () => {};
    }
    const sortable = new Sortable(el, {
      draggable: '.sortable-option',
      animation: 150,
      direction: 'vertical',
    });
    return () => {
      try {
        sortable.destroy();
      } catch (e) {
        // eslint-disable-next-line no-console, lingui/no-unlocalized-strings
        console.error('Failed to destroy sortable', e);
      }
    };
  }, [stackRef]);

  return (
    <Modal
      opened
      onClose={onClose}
      title={
        <Title order={4}>
          <Trans context="schedule.modal-header">Schedule</Trans>
        </Title>
      }
    >
      <Stack gap="xs">
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

        <Stack id="multi-schedule-stack" ref={stackRef}>
          {submissions.map((submission, index) => (
            <Paper key={submission.id} className="sortable-option">
              {submission.getDefaultOptions().data.title} @{' '}
              {getNextDate(selectedDate ?? new Date(), index, {
                days,
                hours,
                minutes,
              }).toLocaleString()}
            </Paper>
          ))}
        </Stack>

        <Group justify="end">
          <Button
            variant="subtle"
            c="var(--mantine-color-text)"
            onClick={onClose}
          >
            <Trans>Cancel</Trans>
          </Button>
          <Button
            onClick={() => {
              onApply(
                submissions.map((s, i) => ({
                  submission: s,
                  date: getNextDate(selectedDate ?? new Date(), i, {
                    days,
                    hours,
                    minutes,
                  }),
                }))
              );
            }}
          >
            <Trans>Apply</Trans>
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
