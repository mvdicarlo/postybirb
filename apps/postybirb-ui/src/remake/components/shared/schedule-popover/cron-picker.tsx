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
import { useCallback, useEffect, useMemo, useState } from 'react';
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

  // Parse initial value
  const parsed = useMemo(() => parseCron(value), [value]);
  const [frequency, setFrequency] = useState<Frequency>(parsed.frequency);
  const [selectedDays, setSelectedDays] = useState<string[]>(
    parsed.selectedDays,
  );
  const [dayOfMonth, setDayOfMonth] = useState(parsed.dayOfMonth);
  const [hour, setHour] = useState(parsed.hour);
  const [minute, setMinute] = useState(parsed.minute);
  const [manualCron, setManualCron] = useState(value);

  // Sync internal state when value changes externally
  useEffect(() => {
    const newParsed = parseCron(value);
    setFrequency(newParsed.frequency);
    setSelectedDays(newParsed.selectedDays);
    setDayOfMonth(newParsed.dayOfMonth);
    setHour(newParsed.hour);
    setMinute(newParsed.minute);
    setManualCron(value);
  }, [value]);

  // Build and emit CRON when builder values change
  const emitBuilderCron = useCallback(() => {
    const cron = buildCron(frequency, selectedDays, dayOfMonth, hour, minute);
    if (cron !== value) {
      onChange(cron);
    }
  }, [frequency, selectedDays, dayOfMonth, hour, minute, value, onChange]);

  // Emit on builder changes
  useEffect(() => {
    if (mode === 'builder') {
      emitBuilderCron();
    }
  }, [mode, emitBuilderCron]);

  // Handle manual CRON change
  const handleManualChange = useCallback(
    (newCron: string) => {
      setManualCron(newCron);
      onChange(newCron);
    },
    [onChange],
  );

  // Validate CRON
  const isValidCron = useMemo(() => {
    try {
      return !!Cron(mode === 'custom' ? manualCron : value);
    } catch {
      return false;
    }
  }, [mode, manualCron, value]);

  // Get next run time
  const nextRun = useMemo(() => {
    try {
      const cronToCheck = mode === 'custom' ? manualCron : value;
      return Cron(cronToCheck)?.nextRun();
    } catch {
      return null;
    }
  }, [mode, manualCron, value]);

  // Get human-readable description
  const cronDescription = useMemo(() => {
    try {
      const cronToCheck = mode === 'custom' ? manualCron : value;
      return cronstrue.toString(cronToCheck, { locale: cronstrueLocale });
    } catch {
      return null;
    }
  }, [mode, manualCron, value, cronstrueLocale]);

  // Handle time input change
  const handleTimeChange = useCallback((timeStr: string) => {
    if (!timeStr) return;
    const [h, m] = timeStr.split(':').map((s) => parseInt(s, 10));
    if (!Number.isNaN(h)) setHour(h);
    if (!Number.isNaN(m)) setMinute(m);
  }, []);

  // Format time for TimeInput
  const timeValue = useMemo(() => {
    const h = String(hour).padStart(2, '0');
    const m = String(minute).padStart(2, '0');
    return `${h}:${m}`;
  }, [hour, minute]);

  return (
    <Stack gap="sm">
      {/* Mode toggle */}
      <SegmentedControl
        value={mode}
        onChange={(v) => setMode(v as CronMode)}
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
            value={frequency}
            onChange={(v) => v && setFrequency(v as Frequency)}
            data={[
              { value: 'daily', label: t`Daily` },
              { value: 'weekly', label: t`Weekly` },
              { value: 'monthly', label: t`Monthly` },
            ]}
          />

          {/* Day picker for weekly */}
          {frequency === 'weekly' && (
            <Box>
              <Text size="xs" fw={500} mb={4}>
                <Trans>Days</Trans>
              </Text>
              <Chip.Group
                multiple
                value={selectedDays}
                onChange={setSelectedDays}
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
          {frequency === 'monthly' && (
            <Select
              label={<Trans>Day of Month</Trans>}
              size="xs"
              value={dayOfMonth}
              onChange={(v) => v && setDayOfMonth(v)}
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
