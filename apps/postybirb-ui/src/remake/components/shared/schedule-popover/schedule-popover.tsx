/**
 * SchedulePopover - Compact popover for editing submission schedules.
 * Supports None/Once/Recurring schedule types with date picker and CRON builder.
 */

import { Trans } from '@lingui/react/macro';
import {
    ActionIcon,
    Box,
    Group,
    Popover,
    SegmentedControl,
    Stack,
    Switch,
    Text,
    Tooltip,
} from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import { useDisclosure } from '@mantine/hooks';
import { ISubmissionScheduleInfo, ScheduleType } from '@postybirb/types';
import {
    IconCalendar,
    IconCalendarOff,
    IconClock,
    IconRepeat,
    IconX,
} from '@tabler/icons-react';
import { Cron } from 'croner';
import moment from 'moment';
import { useCallback, useEffect, useState } from 'react';
import { useLocalStorage } from 'react-use';
import { CronPicker } from './cron-picker';

export interface SchedulePopoverProps {
  /** Current schedule info */
  schedule: ISubmissionScheduleInfo;
  /** Whether the submission is currently scheduled */
  isScheduled: boolean;
  /** Callback when schedule changes */
  onChange: (schedule: ISubmissionScheduleInfo, isScheduled: boolean) => void;
  /** Whether the popover trigger is disabled */
  disabled?: boolean;
  /** Size of the trigger button */
  size?: 'xs' | 'sm' | 'md';
}

const SCHEDULE_GLOBAL_KEY = 'postybirb-last-schedule';
const DEFAULT_CRON = '0 9 * * 5'; // Friday at 9 AM

/**
 * Schedule editing popover with None/Once/Recurring options.
 */
export function SchedulePopover({
  schedule,
  isScheduled,
  onChange,
  disabled,
  size = 'xs',
}: SchedulePopoverProps) {
  const [opened, { close, toggle }] = useDisclosure(false);
  const [internalSchedule, setInternalSchedule] =
    useState<ISubmissionScheduleInfo>(schedule);
  const [internalIsScheduled, setInternalIsScheduled] =
    useState<boolean>(isScheduled);

  // Persist last used schedule date
  const [lastUsedDate, setLastUsedDate] = useLocalStorage<string | undefined>(
    SCHEDULE_GLOBAL_KEY,
    undefined,
  );

  // Sync internal state with props when popover is closed
  useEffect(() => {
    if (!opened) {
      setInternalSchedule(schedule);
      setInternalIsScheduled(isScheduled);
    }
  }, [schedule, isScheduled, opened]);

  // Handle schedule type change
  const handleTypeChange = useCallback(
    (type: string) => {
      const scheduleType = type as ScheduleType;
      let newSchedule: ISubmissionScheduleInfo;

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
          break;
      }

      setInternalSchedule(newSchedule);
      // Don't auto-activate - user must explicitly toggle the switch
      if (scheduleType === ScheduleType.NONE) {
        setInternalIsScheduled(false);
      }
    },
    [lastUsedDate],
  );

  // Handle date change for single schedule
  const handleDateChange = useCallback(
    (date: Date | null) => {
      if (!date) return;
      const scheduledFor = date.toISOString();
      const newSchedule: ISubmissionScheduleInfo = {
        ...internalSchedule,
        scheduledFor,
      };
      setInternalSchedule(newSchedule);
      setLastUsedDate(scheduledFor);
      // Don't call onChange here - will be called on popover close
    },
    [internalSchedule, setLastUsedDate],
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
      // Don't call onChange here - will be called on popover close
    },
    [internalSchedule],
  );

  // Get display info for button
  const getScheduleDisplay = () => {
    // Check if schedule is configured (has date or cron)
    const hasScheduleConfig = Boolean(
      internalSchedule.scheduledFor || internalSchedule.cron,
    );

    if (
      !hasScheduleConfig ||
      internalSchedule.scheduleType === ScheduleType.NONE
    ) {
      return {
        icon: IconCalendarOff,
        color: 'gray',
        tooltip: <Trans>Not scheduled</Trans>,
      };
    }

    // Has config but not activated
    if (!internalIsScheduled) {
      if (internalSchedule.scheduleType === ScheduleType.RECURRING) {
        return {
          icon: IconRepeat,
          color: 'yellow',
          tooltip: <Trans>Schedule configured (inactive)</Trans>,
        };
      }
      return {
        icon: IconClock,
        color: 'yellow',
        tooltip: <Trans>Schedule configured (inactive)</Trans>,
      };
    }

    // Active schedule
    if (internalSchedule.scheduleType === ScheduleType.RECURRING) {
      return {
        icon: IconRepeat,
        color: 'blue',
        tooltip: <Trans>Recurring schedule (active)</Trans>,
      };
    }
    return {
      icon: IconClock,
      color: 'blue',
      tooltip: <Trans>Scheduled (active)</Trans>,
    };
  };

  // Handle toggling schedule active state
  const handleToggleActive = useCallback((checked: boolean) => {
    setInternalIsScheduled(checked);
  }, []);

  // Handle popover close - save changes
  const handleClose = useCallback(() => {
    // Only call onChange if something changed
    if (
      internalSchedule !== schedule ||
      internalIsScheduled !== isScheduled
    ) {
      onChange(internalSchedule, internalIsScheduled);
    }
    close();
  }, [internalSchedule, internalIsScheduled, schedule, isScheduled, onChange, close]);

  const displayInfo = getScheduleDisplay();
  const DisplayIcon = displayInfo.icon;

  // Parse date for picker
  const scheduledDate = internalSchedule.scheduledFor
    ? new Date(internalSchedule.scheduledFor)
    : null;
  const isDateInPast = scheduledDate ? scheduledDate < new Date() : false;

  return (
    <Popover
      closeOnClickOutside
      opened={opened}
      onClose={handleClose}
      position="right"
      withArrow
      shadow="md"
      width={320}
    >
      <Popover.Target>
        <Tooltip label={displayInfo.tooltip}>
          <ActionIcon
            size={size}
            variant="subtle"
            color={displayInfo.color}
            onClick={toggle}
            disabled={disabled}
          >
            <DisplayIcon size={size === 'xs' ? 14 : size === 'sm' ? 16 : 18} />
          </ActionIcon>
        </Tooltip>
      </Popover.Target>

      <Popover.Dropdown>
        <Stack gap="sm">
          <Group justify="space-between" align="center">
            <Text size="sm" fw={500}>
              <Trans>Schedule</Trans>
            </Text>
            <ActionIcon
              size="xs"
              variant="subtle"
              color="gray"
              onClick={handleClose}
            >
              <IconX size={14} />
            </ActionIcon>
          </Group>

          {/* Schedule type selector */}
          <SegmentedControl
            value={internalSchedule.scheduleType}
            onChange={handleTypeChange}
            size="xs"
            fullWidth
            data={[
              {
                value: ScheduleType.NONE,
                label: (
                  <Group gap={4} justify="center">
                    <IconCalendarOff size={14} />
                    <Trans>None</Trans>
                  </Group>
                ),
              },
              {
                value: ScheduleType.SINGLE,
                label: (
                  <Group gap={4} justify="center">
                    <IconCalendar size={14} />
                    <Trans>Once</Trans>
                  </Group>
                ),
              },
              {
                value: ScheduleType.RECURRING,
                label: (
                  <Group gap={4} justify="center">
                    <IconRepeat size={14} />
                    <Trans>Recurring</Trans>
                  </Group>
                ),
              },
            ]}
          />

          {/* Single schedule - Date picker */}
          {internalSchedule.scheduleType === ScheduleType.SINGLE && (
            <Box>
              <DateTimePicker
                label={<Trans>Date and Time</Trans>}
                size="xs"
                clearable={false}
                // eslint-disable-next-line lingui/no-unlocalized-strings
                valueFormat="YYYY-MM-DD HH:mm"
                highlightToday
                minDate={new Date()}
                value={scheduledDate}
                onChange={(value) => {
                  // DateTimePicker returns string when valueFormat is specified
                  if (value) {
                    handleDateChange(new Date(value));
                  } else {
                    handleDateChange(null);
                  }
                }}
                error={isDateInPast ? <Trans>Date is in the past</Trans> : null}
                popoverProps={{ withinPortal: true }}
              />
              {scheduledDate && !isDateInPast && (
                <Text size="xs" c="dimmed" mt={4}>
                  {moment(scheduledDate).fromNow()}
                </Text>
              )}
            </Box>
          )}

          {/* Recurring schedule - CRON picker */}
          {internalSchedule.scheduleType === ScheduleType.RECURRING && (
            <CronPicker
              value={internalSchedule.cron || DEFAULT_CRON}
              onChange={handleCronChange}
            />
          )}

          {/* None - info text */}
          {internalSchedule.scheduleType === ScheduleType.NONE && (
            <Text size="xs" c="dimmed">
              <Trans>This submission will not be automatically posted.</Trans>
            </Text>
          )}

          {/* Activation toggle - only show when schedule is configured */}
          {internalSchedule.scheduleType !== ScheduleType.NONE && (
            <Box onClick={(e) => e.stopPropagation()}>
              <Switch
                label={<Trans>Activate schedule</Trans>}
                description={
                  internalIsScheduled ? (
                    <Trans>Submission will be posted automatically</Trans>
                  ) : (
                    <Trans>Schedule is configured but inactive</Trans>
                  )
                }
                checked={internalIsScheduled}
                onChange={(e) => handleToggleActive(e.currentTarget.checked)}
                size="sm"
              />
            </Box>
          )}
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
