/**
 * CronPicker - Intuitive CRON builder with frequency/day/time pickers
 * plus manual CRON input toggle for power users.
 */

import { Trans, useLingui as useLinguiMacro } from '@lingui/react/macro';
import {
  Anchor,
  Box,
  Chip,
  Group,
  SegmentedControl,
  Select,
  Stack,
  Text,
  TextInput,
  Tooltip,
  useMantineColorScheme,
} from '@mantine/core';
import { TimeInput } from '@mantine/dates';
import {
  IconAt,
  IconCalendar,
  IconCode,
  IconExternalLink,
} from '@tabler/icons-react';
import { Cron } from 'croner';
import cronstrue from 'cronstrue';
import { useCallback, useMemo, useState } from 'react';
import { useLocale } from '../../../hooks';

export interface CronPickerProps {
  /** Current CRON expression */
  value: string;
  /** Callback when CRON changes */
  onChange: (cron: string) => void;
}

type Frequency = 'daily' | 'weekly' | 'monthly';
type CronMode = 'builder' | 'custom';

/* eslint-disable lingui/no-unlocalized-strings */
// Days of week for chip selection
const DAYS_OF_WEEK = [
  { value: '1', label: 'Mon' },
  { value: '2', label: 'Tue' },
  { value: '3', label: 'Wed' },
  { value: '4', label: 'Thu' },
  { value: '5', label: 'Fri' },
  { value: '6', label: 'Sat' },
  { value: '0', label: 'Sun' },
];

// Days of month options
const DAYS_OF_MONTH = Array.from({ length: 31 }, (_, i) => ({
  value: String(i + 1),
  label: `${i + 1}${getOrdinalSuffix(i + 1)}`,
}));
/* eslint-enable lingui/no-unlocalized-strings */

function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

/**
 * Parse a CRON expression to extract frequency, days, and time.
 */
function parseCron(cron: string): {
  frequency: Frequency;
  selectedDays: string[];
  dayOfMonth: string;
  hour: number;
  minute: number;
} {
  try {
    const parts = cron.trim().split(' ');
    if (parts.length !== 5) {
      return {
        frequency: 'weekly',
        selectedDays: ['5'],
        dayOfMonth: '1',
        hour: 9,
        minute: 0,
      };
    }

    const [minuteStr, hourStr, dayStr, , dayOfWeekStr] = parts;
    const minute = parseInt(minuteStr, 10) || 0;
    const hour = parseInt(hourStr, 10) || 0;

    // Determine frequency
    if (dayOfWeekStr !== '*' && dayStr === '*') {
      // Weekly - has specific days of week
      const selectedDays = dayOfWeekStr.split(',').filter((d) => d !== '*');
      return {
        frequency: 'weekly',
        selectedDays,
        dayOfMonth: '1',
        hour,
        minute,
      };
    }
    if (dayStr !== '*') {
      // Monthly - has specific day of month
      return {
        frequency: 'monthly',
        selectedDays: [],
        dayOfMonth: dayStr,
        hour,
        minute,
      };
    }
    // Daily - runs every day
    return {
      frequency: 'daily',
      selectedDays: [],
      dayOfMonth: '1',
      hour,
      minute,
    };
  } catch {
    return {
      frequency: 'weekly',
      selectedDays: ['5'],
      dayOfMonth: '1',
      hour: 9,
      minute: 0,
    };
  }
}

/**
 * Build a CRON expression from frequency, days, and time.
 */
function buildCron(
  frequency: Frequency,
  selectedDays: string[],
  dayOfMonth: string,
  hour: number,
  minute: number,
): string {
  const minuteStr = String(minute);
  const hourStr = String(hour);

  switch (frequency) {
    case 'daily':
      return `${minuteStr} ${hourStr} * * *`;
    case 'weekly': {
      const days = selectedDays.length > 0 ? selectedDays.join(',') : '*';
      return `${minuteStr} ${hourStr} * * ${days}`;
    }
    case 'monthly':
      return `${minuteStr} ${hourStr} ${dayOfMonth} * *`;
    default:
      return `${minuteStr} ${hourStr} * * *`;
  }
}

/**
 * CronPicker component with intuitive builder and manual input modes.
 */
export function CronPicker({ value, onChange }: CronPickerProps) {
  const { t } = useLinguiMacro();
  const { cronstrueLocale, formatDateTime } = useLocale();
  const { colorScheme } = useMantineColorScheme();
  const [mode, setMode] = useState<CronMode>('builder');
  const [manualCron, setManualCron] = useState(value);

  // Parse current value for display - derived state, no local copies
  const parsed = useMemo(() => parseCron(value), [value]);

  // Helper to emit new cron from builder with updated field
  const emitBuilderChange = useCallback(
    (updates: Partial<{
      frequency: Frequency;
      selectedDays: string[];
      dayOfMonth: string;
      hour: number;
      minute: number;
    }>) => {
      const newFrequency = updates.frequency ?? parsed.frequency;
      const newSelectedDays = updates.selectedDays ?? parsed.selectedDays;
      const newDayOfMonth = updates.dayOfMonth ?? parsed.dayOfMonth;
      const newHour = updates.hour ?? parsed.hour;
      const newMinute = updates.minute ?? parsed.minute;

      const cron = buildCron(
        newFrequency,
        newSelectedDays,
        newDayOfMonth,
        newHour,
        newMinute,
      );
      if (cron !== value) {
        onChange(cron);
      }
    },
    [parsed, value, onChange],
  );

  // User interaction handlers - each explicitly calls onChange
  const handleFrequencyChange = useCallback(
    (newFrequency: Frequency) => {
      emitBuilderChange({ frequency: newFrequency });
    },
    [emitBuilderChange],
  );

  const handleDaysChange = useCallback(
    (newDays: string[]) => {
      emitBuilderChange({ selectedDays: newDays });
    },
    [emitBuilderChange],
  );

  const handleDayOfMonthChange = useCallback(
    (newDay: string) => {
      emitBuilderChange({ dayOfMonth: newDay });
    },
    [emitBuilderChange],
  );

  const handleTimeChange = useCallback(
    (timeStr: string) => {
      if (!timeStr) return;
      const [h, m] = timeStr.split(':').map((s) => parseInt(s, 10));
      if (Number.isNaN(h) || Number.isNaN(m)) return;
      emitBuilderChange({ hour: h, minute: m });
    },
    [emitBuilderChange],
  );

  // Handle manual CRON change
  const handleManualChange = useCallback(
    (newCron: string) => {
      setManualCron(newCron);
      onChange(newCron);
    },
    [onChange],
  );

  // Sync manual input when switching modes or value changes externally
  const handleModeChange = useCallback(
    (newMode: CronMode) => {
      setMode(newMode);
      if (newMode === 'custom') {
        setManualCron(value);
      }
    },
    [value],
  );

  // Validate CRON
  const cronToValidate = mode === 'custom' ? manualCron : value;
  const isValidCron = useMemo(() => {
    try {
      return !!Cron(cronToValidate);
    } catch {
      return false;
    }
  }, [cronToValidate]);

  // Get next run time
  const nextRun = useMemo(() => {
    try {
      return Cron(cronToValidate)?.nextRun();
    } catch {
      return null;
    }
  }, [cronToValidate]);

  // Get human-readable description
  const cronDescription = useMemo(() => {
    try {
      return cronstrue.toString(cronToValidate, { locale: cronstrueLocale });
    } catch {
      return null;
    }
  }, [cronToValidate, cronstrueLocale]);

  // Format time for TimeInput - derived from parsed value
  const timeValue = useMemo(() => {
    const h = String(parsed.hour).padStart(2, '0');
    const m = String(parsed.minute).padStart(2, '0');
    return `${h}:${m}`;
  }, [parsed.hour, parsed.minute]);

  return (
    <Stack gap="sm">
      {/* Mode toggle */}
      <SegmentedControl
        value={mode}
        onChange={(v) => handleModeChange(v as CronMode)}
        size="xs"
        data={[
          {
            value: 'builder',
            label: (
              <Group gap={4}>
                <IconCalendar size={14} />
                <Trans>Builder</Trans>
              </Group>
            ),
          },
          {
            value: 'custom',
            label: (
              <Group gap={4}>
                <IconCode size={14} />
                <Trans>Custom</Trans>
              </Group>
            ),
          },
        ]}
      />

      {mode === 'builder' ? (
        <Stack gap="sm">
          {/* Frequency selector */}
          <Select
            label={<Trans>Frequency</Trans>}
            size="xs"
            value={parsed.frequency}
            onChange={(v) => v && handleFrequencyChange(v as Frequency)}
            data={[
              { value: 'daily', label: t`Daily` },
              { value: 'weekly', label: t`Weekly` },
              { value: 'monthly', label: t`Monthly` },
            ]}
          />

          {/* Day picker for weekly */}
          {parsed.frequency === 'weekly' && (
            <Box>
              <Text size="xs" fw={500} mb={4}>
                <Trans>Days</Trans>
              </Text>
              <Chip.Group
                multiple
                value={parsed.selectedDays}
                onChange={handleDaysChange}
              >
                <Group gap={4}>
                  {DAYS_OF_WEEK.map((day) => (
                    <Chip key={day.value} value={day.value} size="xs">
                      {day.label}
                    </Chip>
                  ))}
                </Group>
              </Chip.Group>
            </Box>
          )}

          {/* Day of month for monthly */}
          {parsed.frequency === 'monthly' && (
            <Select
              label={<Trans>Day of Month</Trans>}
              size="xs"
              value={parsed.dayOfMonth}
              onChange={(v) => v && handleDayOfMonthChange(v)}
              data={DAYS_OF_MONTH}
              searchable
            />
          )}

          {/* Time picker */}
          <TimeInput
            label={<Trans>Time</Trans>}
            size="xs"
            value={timeValue}
            onChange={(e) => handleTimeChange(e.currentTarget.value)}
          />
        </Stack>
      ) : (
        <Stack gap="xs">
          {/* Manual CRON input */}
          <TextInput
            label={
              <Group gap={4}>
                <Trans>CRON Expression</Trans>
                <Tooltip label={<Trans>Open CRON helper</Trans>}>
                  <Anchor
                    href="https://crontab.cronhub.io/"
                    target="_blank"
                    size="xs"
                  >
                    <IconExternalLink size={12} />
                  </Anchor>
                </Tooltip>
              </Group>
            }
            size="xs"
            placeholder="0 9 * * 1-5"
            value={manualCron}
            onChange={(e) => handleManualChange(e.currentTarget.value)}
            error={
              manualCron && !isValidCron ? (
                <Trans>Invalid CRON expression</Trans>
              ) : null
            }
          />
          <Text size="xs" c="dimmed">
            <Trans>Format: minute hour day month weekday</Trans>
          </Text>
        </Stack>
      )}

      {/* Description and next run */}
      {isValidCron && cronDescription && (
        <Box p="xs">
          <Text size="xs" fw={500} c="green">
            {cronDescription}
          </Text>
          {nextRun && (
            <Text size="xs" c="dimmed">
              <IconAt size="1em" style={{ verticalAlign: 'middle' }} />{' '}
              {formatDateTime(nextRun)}
            </Text>
          )}
        </Box>
      )}
    </Stack>
  );
}
