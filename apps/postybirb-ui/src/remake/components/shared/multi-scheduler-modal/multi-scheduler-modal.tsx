/**
 * MultiSchedulerModal - Modal for scheduling multiple submissions at once.
 * Features a two-column layout with reorderable submission list and schedule form.
 */

import { Trans, useLingui } from '@lingui/react/macro';
import {
  Box,
  Button,
  Checkbox,
  Divider,
  Group,
  Modal,
  NumberInput,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import { ScheduleType } from '@postybirb/types';
import { IconCalendarEvent } from '@tabler/icons-react';
import { useCallback, useMemo, useState } from 'react';
import { useLocalStorage } from 'react-use';
import submissionApi from '../../../api/submission.api';
import { useLocale } from '../../../hooks';
import type { SubmissionRecord } from '../../../stores/records';
import {
  showErrorNotification,
  showSuccessNotification,
} from '../../../utils/notifications';
import { ReorderableSubmissionList } from '../reorderable-submission-list';
import './multi-scheduler-modal.css';

// LocalStorage key for last used schedule date
const SCHEDULE_STORAGE_KEY = 'postybirb-last-schedule-date';

export interface MultiSchedulerModalProps {
  /** Whether the modal is open */
  opened: boolean;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Submissions to schedule */
  submissions: SubmissionRecord[];
}

/**
 * Calculate the next date based on index and increments.
 * First submission (index 0) is at baseDate, subsequent submissions are offset by increments * index.
 */
function getNextDate(
  baseDate: Date,
  index: number,
  increments: { days: number; hours: number; minutes: number },
): Date {
  const { days, hours, minutes } = increments;
  const nextDate = new Date(baseDate);

  // Simply multiply each increment by the index
  nextDate.setDate(nextDate.getDate() + days * index);
  nextDate.setHours(nextDate.getHours() + hours * index);
  nextDate.setMinutes(nextDate.getMinutes() + minutes * index);

  return nextDate;
}

/**
 * MultiSchedulerModal component.
 * Provides a two-column interface for scheduling multiple submissions.
 */
export function MultiSchedulerModal({
  opened,
  onClose,
  submissions: initialSubmissions,
}: MultiSchedulerModalProps) {
  const { t } = useLingui();
  const { formatDateTime } = useLocale();

  // Reorderable submissions state
  const [orderedSubmissions, setOrderedSubmissions] =
    useState<SubmissionRecord[]>(initialSubmissions);

  // Schedule form state
  const [lastUsedDate, setLastUsedDate] = useLocalStorage<string | undefined>(
    SCHEDULE_STORAGE_KEY,
    undefined,
  );
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => {
    if (lastUsedDate) {
      const parsed = new Date(lastUsedDate);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    return new Date();
  });
  const [days, setDays] = useState(1);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [onlySetDate, setOnlySetDate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validation - at least one interval must be set
  const isValid = days > 0 || hours > 0 || minutes > 0;

  // Reset state when modal opens with new submissions
  useMemo(() => {
    setOrderedSubmissions(initialSubmissions);
  }, [initialSubmissions]);

  // Handle date change
  const handleDateChange = useCallback(
    (value: Date | string | null) => {
      // DateTimePicker may pass string or Date
      const date = value
        ? typeof value === 'string'
          ? new Date(value)
          : value
        : null;
      setSelectedDate(date);
      if (date && !Number.isNaN(date.getTime())) {
        setLastUsedDate(date.toISOString());
      }
    },
    [setLastUsedDate],
  );

  // Render schedule time preview for each item
  const renderSchedulePreview = useCallback(
    (_submission: SubmissionRecord, index: number) => {
      if (!selectedDate) return null;
      const scheduledDate = getNextDate(selectedDate, index, {
        days,
        hours,
        minutes,
      });
      return (
        <Text size="xs" c="dimmed">
          {formatDateTime(scheduledDate)}
        </Text>
      );
    },
    [selectedDate, days, hours, minutes, formatDateTime],
  );

  // Handle apply
  const handleApply = useCallback(async () => {
    if (!isValid || !selectedDate) return;

    setIsSubmitting(true);
    try {
      // Schedule each submission
      const promises = orderedSubmissions.map((submission, index) => {
        const scheduledFor = getNextDate(selectedDate, index, {
          days,
          hours,
          minutes,
        });

        return submissionApi.update(submission.id, {
          scheduleType: ScheduleType.SINGLE,
          scheduledFor: scheduledFor.toISOString(),
          isScheduled: !onlySetDate,
        });
      });

      await Promise.all(promises);

      showSuccessNotification(
        <Trans>
          Successfully scheduled ${orderedSubmissions.length} submissions
        </Trans>,
      );
      onClose();
    } catch (error) {
      showErrorNotification(
        error instanceof Error
          ? error.message
          : t`Failed to schedule submissions`,
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [
    isValid,
    selectedDate,
    orderedSubmissions,
    days,
    hours,
    minutes,
    onlySetDate,
    onClose,
    t,
  ]);

  return (
    <Modal
      zIndex={300}
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <IconCalendarEvent size={20} />
          <Title order={4}>
            <Trans>Schedule Submissions</Trans>
          </Title>
        </Group>
      }
      size="xl"
      centered
      radius="md"
      classNames={{
        body: 'postybirb__multi-scheduler-body',
      }}
    >
      <Box className="postybirb__multi-scheduler-content">
        {/* Left column - Reorderable list */}
        <Box className="postybirb__multi-scheduler-list">
          <Text size="sm" fw={500} mb="xs">
            <Trans>Submission Order</Trans>
          </Text>
          <ReorderableSubmissionList
            submissions={orderedSubmissions}
            onReorder={setOrderedSubmissions}
            renderExtra={renderSchedulePreview}
            maxHeight="350px"
          />
        </Box>

        {/* Divider */}
        <Divider
          orientation="vertical"
          className="postybirb__multi-scheduler-divider"
        />

        {/* Right column - Schedule form */}
        <Box className="postybirb__multi-scheduler-form">
          <Text size="sm" fw={500} mb="xs">
            <Trans>Schedule Settings</Trans>
          </Text>
          <Stack gap="md">
            <DateTimePicker
              // eslint-disable-next-line lingui/no-unlocalized-strings
              valueFormat="YYYY-MM-DD HH:mm"
              label={<Trans>Start Date</Trans>}
              value={selectedDate}
              onChange={handleDateChange}
              minDate={new Date()}
              clearable
              required
            />

            <Text size="xs" c="dimmed">
              <Trans>
                Set the interval between each submission. The first submission
                will be scheduled at the start date, and each subsequent
                submission will be offset by the interval.
              </Trans>
            </Text>

            <Group grow>
              <NumberInput
                label={<Trans>Days</Trans>}
                value={days}
                onChange={(v) => setDays(Number(v) || 0)}
                min={0}
                step={1}
              />
              <NumberInput
                label={<Trans>Hours</Trans>}
                value={hours}
                onChange={(v) => setHours(Number(v) || 0)}
                min={0}
                step={1}
              />
              <NumberInput
                label={<Trans>Minutes</Trans>}
                value={minutes}
                onChange={(v) => setMinutes(Number(v) || 0)}
                min={0}
                step={1}
              />
            </Group>

            <Checkbox
              label={<Trans>Only set scheduled date (don't activate)</Trans>}
              checked={onlySetDate}
              onChange={(e) => setOnlySetDate(e.currentTarget.checked)}
            />
          </Stack>
        </Box>
      </Box>

      {/* Footer */}
      <Group justify="flex-end" mt="md">
        <Button variant="default" onClick={onClose} disabled={isSubmitting}>
          <Trans>Cancel</Trans>
        </Button>
        <Button
          onClick={handleApply}
          disabled={!isValid}
          loading={isSubmitting}
        >
          <Trans>Schedule</Trans>
        </Button>
      </Group>
    </Modal>
  );
}
