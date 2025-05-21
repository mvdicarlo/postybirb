import { msg, Trans } from '@lingui/macro';
import {
  Box,
  Button,
  Chip,
  Group,
  NativeSelect,
  NumberInput,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import { useEffect, useRef, useState } from 'react';
import { useTrans } from '../../../hooks/use-trans';

interface CronBuilderProps {
  value: string;
  onChange: (value: string) => void;
}

type TimeUnit = 'minute' | 'hour' | 'day' | 'month' | 'dayOfWeek';
type FrequencyType = 'specific' | 'every' | 'range' | 'multiple';

interface CronParts {
  minute: string;
  hour: string;
  day: string;
  month: string;
  dayOfWeek: string;
}

const DEFAULT_CRON: CronParts = {
  minute: '0',
  hour: '0',
  day: '*',
  month: '*',
  dayOfWeek: '*',
};

const MONTHS = [
  { value: '1', label: msg`January` },
  { value: '2', label: msg`February` },
  { value: '3', label: msg`March` },
  { value: '4', label: msg`April` },
  { value: '5', label: msg`May` },
  { value: '6', label: msg`June` },
  { value: '7', label: msg`July` },
  { value: '8', label: msg`August` },
  { value: '9', label: msg`September` },
  { value: '10', label: msg`October` },
  { value: '11', label: msg`November` },
  { value: '12', label: msg`December` },
];

const DAYS_OF_WEEK = [
  { value: '0', label: msg`Sunday` },
  { value: '1', label: msg`Monday` },
  { value: '2', label: msg`Tuesday` },
  { value: '3', label: msg`Wednesday` },
  { value: '4', label: msg`Thursday` },
  { value: '5', label: msg`Friday` },
  { value: '6', label: msg`Saturday` },
];

const COMMON_SCHEDULES = [
  {
    label: <Trans>Daily at midnight</Trans>,
    cron: '0 0 * * *',
    description: <Trans>Runs every day at 12:00 AM</Trans>,
  },
  {
    label: <Trans>Daily at 9 AM</Trans>,
    cron: '0 9 * * *',
    description: <Trans>Runs every day at 9:00 AM</Trans>,
  },
  {
    label: <Trans>Weekdays at 9 AM</Trans>,
    cron: '0 9 * * 1-5',
    description: <Trans>Runs Monday through Friday at 9:00 AM</Trans>,
  },
  {
    label: <Trans>Weekend at noon</Trans>,
    cron: '0 12 * * 0,6',
    description: <Trans>Runs Saturday and Sunday at 12:00 PM</Trans>,
  },
  {
    label: <Trans>Weekly on Monday</Trans>,
    cron: '0 0 * * 1',
    description: <Trans>Runs every Monday at 12:00 AM</Trans>,
  },
  {
    label: <Trans>Monthly (1st of month)</Trans>,
    cron: '0 0 1 * *',
    description: <Trans>Runs on the 1st day of every month at 12:00 AM</Trans>,
  },
];

/**
 * Parse a CRON expression into its constituent parts
 */
function parseCronExpression(cronExpression: string): CronParts {
  try {
    const parts = cronExpression.trim().split(' ');
    if (parts.length !== 5) {
      return DEFAULT_CRON;
    }

    return {
      minute: parts[0],
      hour: parts[1],
      day: parts[2],
      month: parts[3],
      dayOfWeek: parts[4],
    };
  } catch {
    return DEFAULT_CRON;
  }
}

/**
 * Convert a cron parts object back to a cron expression string
 */
function buildCronExpression(parts: CronParts): string {
  return `${parts.minute} ${parts.hour} ${parts.day} ${parts.month} ${parts.dayOfWeek}`;
}

// Time selection component moved outside the main component
function TimeSelector({
  hour,
  minute,
  onPartChange,
}: {
  hour: string;
  minute: string;
  onPartChange: (part: TimeUnit, value: string) => void;
}) {
  return (
    <Group align="flex-end" grow>
      <NumberInput
        label={<Trans>Hour (0-23)</Trans>}
        description={<Trans>Hour of the day</Trans>}
        min={0}
        max={23}
        value={hour === '*' ? 0 : parseInt(hour, 10)}
        onChange={(val) => onPartChange('hour', val?.toString() || '0')}
      />
      <NumberInput
        label={<Trans>Minute (0-59)</Trans>}
        description={<Trans>Minute of the hour</Trans>}
        min={0}
        max={59}
        value={minute === '*' ? 0 : parseInt(minute, 10)}
        onChange={(val) => onPartChange('minute', val?.toString() || '0')}
      />
    </Group>
  );
}

// Day selector component moved outside the main component
function DaySelector({
  dayOfWeek,
  onPartChange,
}: {
  dayOfWeek: string;
  onPartChange: (part: TimeUnit, value: string) => void;
}) {
  const t = useTrans();
  return (
    <Box>
      <Text size="sm" fw={500}>
        <Trans>Day of Week</Trans>
      </Text>
      <Text size="xs" c="dimmed" mb="xs">
        <Trans>Select the days when this should run</Trans>
      </Text>
      <Chip.Group
        multiple
        value={dayOfWeek === '*' ? [] : dayOfWeek.split(',')}
        onChange={(selected) => {
          onPartChange(
            'dayOfWeek',
            selected.length === 0 ? '*' : selected.join(','),
          );
        }}
      >
        <Group>
          {DAYS_OF_WEEK.map((day) => (
            <Chip key={day.value} value={day.value}>
              {t(day.label)}
            </Chip>
          ))}
        </Group>
      </Chip.Group>
    </Box>
  );
}

// Month selector component moved outside the main component
function MonthSelector({
  month,
  onPartChange,
}: {
  month: string;
  onPartChange: (part: TimeUnit, value: string) => void;
}) {
  const t = useTrans();

  return (
    <Box>
      <Text size="sm" fw={500}>
        <Trans>Month</Trans>
      </Text>
      <Text size="xs" c="dimmed" mb="xs">
        <Trans>Select specific months or all</Trans>
      </Text>
      <NativeSelect
        data={[
          { value: '*', label: t(msg`Every month`) },
          ...MONTHS.map((e) => ({ value: e.value, label: t(e.label) })),
        ]}
        value={month}
        onChange={(e) => onPartChange('month', e.currentTarget.value)}
      />
    </Box>
  );
}

// Day of month selector component moved outside the main component
function DayOfMonthSelector({
  day,
  onPartChange,
}: {
  day: string;
  onPartChange: (part: TimeUnit, value: string) => void;
}) {
  return (
    <Box>
      <Text size="sm" fw={500}>
        <Trans>Day of Month</Trans>
      </Text>
      <Text size="xs" c="dimmed" mb="xs">
        <Trans>Select specific day of month or every day</Trans>
      </Text>
      <Group>
        <NumberInput
          label={<Trans>Day (1-31)</Trans>}
          disabled={day === '*'}
          min={1}
          max={31}
          value={day === '*' ? 1 : parseInt(day, 10)}
          onChange={(val) => onPartChange('day', val?.toString() || '1')}
          w={120}
        />
        <Button
          variant={day === '*' ? 'filled' : 'light'}
          onClick={() => onPartChange('day', day === '*' ? '1' : '*')}
          style={{ marginTop: 'auto' }}
        >
          {day === '*' ? <Trans>Every day</Trans> : <Trans>Specific day</Trans>}
        </Button>
      </Group>
    </Box>
  );
}

/**
 * A user-friendly CRON builder component
 */
export function CronBuilder({ value, onChange }: CronBuilderProps) {
  const [cronParts, setCronParts] = useState<CronParts>(
    parseCronExpression(value || '0 0 * * *'),
  );

  // Track the last emitted value to prevent redundant updates
  const lastEmittedValueRef = useRef<string>(value || '0 0 * * *');

  // Sync internal state with the value prop when it changes
  useEffect(() => {
    const parsedValue = parseCronExpression(value || '0 0 * * *');
    const builtValue = buildCronExpression(parsedValue);

    // Only update state if the incoming value differs from the last emitted value
    if (value !== lastEmittedValueRef.current) {
      setCronParts(parsedValue);
      lastEmittedValueRef.current = builtValue;
    }
  }, [value]);

  // Emit changes when cronParts changes, but only if the value differs
  useEffect(() => {
    const cronExpression = buildCronExpression(cronParts);

    // Only call onChange if the new value differs from the last emitted value
    if (cronExpression !== lastEmittedValueRef.current) {
      lastEmittedValueRef.current = cronExpression;
      onChange(cronExpression);
    }
  }, [cronParts, onChange]);

  const handlePartChange = (part: TimeUnit, v: string) => {
    setCronParts((prev) => ({
      ...prev,
      [part]: v,
    }));
  };

  return (
    <Stack gap="md">
      <Box>
        <Text size="sm" fw={500}>
          <Trans>Common Schedules</Trans>
        </Text>
        <Text size="xs" c="dimmed" mb="xs">
          <Trans>Quick selection of common scheduling patterns</Trans>
        </Text>
        <Group>
          {COMMON_SCHEDULES.map((schedule) => (
            <Tooltip key={schedule.cron} label={schedule.description}>
              <Button
                variant={value === schedule.cron ? 'filled' : 'light'}
                size="xs"
                onClick={() => {
                  setCronParts(parseCronExpression(schedule.cron));
                }}
              >
                {schedule.label}
              </Button>
            </Tooltip>
          ))}
        </Group>
      </Box>

      <TimeSelector
        hour={cronParts.hour}
        minute={cronParts.minute}
        onPartChange={handlePartChange}
      />

      <DaySelector
        dayOfWeek={cronParts.dayOfWeek}
        onPartChange={handlePartChange}
      />

      <MonthSelector month={cronParts.month} onPartChange={handlePartChange} />

      <DayOfMonthSelector day={cronParts.day} onPartChange={handlePartChange} />
    </Stack>
  );
}
