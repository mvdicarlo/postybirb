/**
 * ScheduleForm - Inline schedule editor for submission edit card.
 * Supports None/Once/Recurring schedule types with date picker and CRON builder.
 */

import { Trans } from '@lingui/react/macro';
import { Group, Paper, Stack, Switch, Tabs, Text, Title } from '@mantine/core';
import { DateTimePicker, DateValue } from '@mantine/dates';
import { ISubmissionScheduleInfo, ScheduleType } from '@postybirb/types';
import { IconCalendar, IconCalendarOff, IconRepeat } from '@tabler/icons-react';
import { Cron } from 'croner';
import moment from 'moment';
import { useCallback, useEffect, useState } from 'react';
import { useLocalStorage } from 'react-use';
import { useLocale } from '../../../../../hooks';
import { CronPicker } from '../../../../shared/schedule-popover/cron-picker';

export interface ScheduleFormProps {
  /** Current schedule info */
  schedule: ISubmissionScheduleInfo;
  /** Whether the submission is currently scheduled */
  isScheduled: boolean;
  /** Callback when schedule changes */
  onChange: (schedule: ISubmissionScheduleInfo, isScheduled: boolean) => void;
}

const SCHEDULE_GLOBAL_KEY = 'postybirb-last-schedule';
const DEFAULT_CRON = '0 9 * * 5'; // Friday at 9 AM

/**
 * Inline schedule form with None/Once/Recurring options.
 */
export function ScheduleForm({
  schedule,
  isScheduled,
  onChange,
}: ScheduleFormProps) {
  const { formatRelativeTime } = useLocale();
  const [internalSchedule, setInternalSchedule] =
    useState<ISubmissionScheduleInfo>(schedule);
  const [internalIsScheduled, setInternalIsScheduled] =
    useState<boolean>(isScheduled);

  // Persist last used schedule date
  const [lastUsedDate, setLastUsedDate] = useLocalStorage<string | undefined>(
    SCHEDULE_GLOBAL_KEY,
    undefined,
  );

  // Sync internal state with props
  useEffect(() => {
    setInternalSchedule(schedule);
    setInternalIsScheduled(isScheduled);
  }, [schedule, isScheduled]);

  // Handle schedule type change
  const handleTypeChange = useCallback(
    (type: string | null) => {
      const scheduleType = type as ScheduleType;
      let newSchedule: ISubmissionScheduleInfo;
      let newIsScheduled = internalIsScheduled;

      switch (scheduleType) {
        case ScheduleType.SINGLE: {
          // Use last used date if valid, otherwise tomorrow
          let scheduledFor: string;
          if (lastUsedDate && new Date(lastUsedDate) > new Date()) {
            scheduledFor = lastUsedDate;
          } else {
            scheduledFor = moment()
              .add(1, 'day')
              .hour(9)
              .minute(0)
              .toISOString();
          }
          newSchedule = {
            scheduleType,
            scheduledFor,
            cron: undefined,
          };
          break;
        }
        case ScheduleType.RECURRING: {
          const nextRun = Cron(DEFAULT_CRON)?.nextRun()?.toISOString();
          newSchedule = {
            scheduleType,
            cron: DEFAULT_CRON,
            scheduledFor: nextRun,
          };
          break;
        }
        case ScheduleType.NONE:
        default:
          newSchedule = {
            scheduleType: ScheduleType.NONE,
            scheduledFor: undefined,
            cron: undefined,
          };
          newIsScheduled = false;
          break;
      }

      setInternalSchedule(newSchedule);
      setInternalIsScheduled(newIsScheduled);
      onChange(newSchedule, newIsScheduled);
    },
    [lastUsedDate, internalIsScheduled, onChange],
  );

  // Handle date/time change for single schedule
  const handleDateTimeChange = useCallback(
    (date: DateValue) => {
      if (!date) return;
      // DateValue can be Date or string, convert to ISO string
      const scheduledFor = date instanceof Date ? date.toISOString() : new Date(date).toISOString();
      const newSchedule: ISubmissionScheduleInfo = {
        ...internalSchedule,
        scheduledFor,
      };
      setInternalSchedule(newSchedule);
      setLastUsedDate(scheduledFor);
      onChange(newSchedule, internalIsScheduled);
    },
    [internalSchedule, internalIsScheduled, setLastUsedDate, onChange],
  );

  // Handle CRON change for recurring schedule
  const handleCronChange = useCallback(
    (cron: string) => {
      let scheduledFor: string | undefined;
      try {
        scheduledFor = Cron(cron)?.nextRun()?.toISOString();
      } catch {
        // Invalid cron
      }
      const newSchedule: ISubmissionScheduleInfo = {
        ...internalSchedule,
        cron,
        scheduledFor,
      };
      setInternalSchedule(newSchedule);
      onChange(newSchedule, internalIsScheduled);
    },
    [internalSchedule, internalIsScheduled, onChange],
  );

  // Handle toggling schedule active state
  const handleToggleActive = useCallback(
    (checked: boolean) => {
      setInternalIsScheduled(checked);
      onChange(internalSchedule, checked);
    },
    [internalSchedule, onChange],
  );

  // Parse date for picker
  const scheduledDate = internalSchedule.scheduledFor
    ? new Date(internalSchedule.scheduledFor)
    : null;

  const isDateInPast = scheduledDate ? scheduledDate < new Date() : false;

  return (
    <Paper withBorder p="md" radius="sm">
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <Title order={6}>
            <Trans>Schedule</Trans>
          </Title>
          {/* Activation toggle - only show when schedule is configured */}
          {internalSchedule.scheduleType !== ScheduleType.NONE && (
            <Switch
              label={
                internalIsScheduled ? (
                  <Trans>Active</Trans>
                ) : (
                  <Trans>Inactive</Trans>
                )
              }
              checked={internalIsScheduled}
              onChange={(e) => handleToggleActive(e.currentTarget.checked)}
              size="sm"
            />
          )}
        </Group>

        {/* Vertical tabs layout */}
        <Tabs
          value={internalSchedule.scheduleType}
          onChange={handleTypeChange}
          orientation="vertical"
          variant="pills"
        >
          <Tabs.List>
            <Tabs.Tab
              value={ScheduleType.NONE}
              leftSection={<IconCalendarOff size={16} />}
            >
              <Trans>None</Trans>
            </Tabs.Tab>
            <Tabs.Tab
              value={ScheduleType.SINGLE}
              leftSection={<IconCalendar size={16} />}
            >
              <Trans>Once</Trans>
            </Tabs.Tab>
            <Tabs.Tab
              value={ScheduleType.RECURRING}
              leftSection={<IconRepeat size={16} />}
            >
              <Trans>Recurring</Trans>
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value={ScheduleType.NONE} pl="md">
            <Stack gap="sm">
              <Text size="sm" c="dimmed">
                <Trans>No schedule configured</Trans>
              </Text>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value={ScheduleType.SINGLE} pl="md">
            <Stack gap="sm">
              <DateTimePicker
                label={<Trans>Date and Time</Trans>}
                size="sm"
                clearable={false}
                // eslint-disable-next-line lingui/no-unlocalized-strings
                valueFormat="YYYY-MM-DD HH:mm"
                highlightToday
                minDate={new Date()}
                value={scheduledDate}
                onChange={handleDateTimeChange}
                error={isDateInPast ? <Trans>Date is in the past</Trans> : null}
              />
              {scheduledDate && !isDateInPast && (
                <Text size="xs" c="dimmed">
                  {formatRelativeTime(scheduledDate)}
                </Text>
              )}
              <Text size="sm" c={internalIsScheduled ? 'blue' : 'dimmed'}>
                {internalIsScheduled ? (
                  <Trans>Submission will be posted automatically</Trans>
                ) : (
                  <Trans>Schedule is configured but inactive</Trans>
                )}
              </Text>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value={ScheduleType.RECURRING} pl="md">
            <Stack gap="sm">
              <CronPicker
                value={internalSchedule.cron || DEFAULT_CRON}
                onChange={handleCronChange}
              />
              <Text size="sm" c={internalIsScheduled ? 'blue' : 'dimmed'}>
                {internalIsScheduled ? (
                  <Trans>Submission will be posted automatically</Trans>
                ) : (
                  <Trans>Schedule is configured but inactive</Trans>
                )}
              </Text>
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Paper>
  );
}
