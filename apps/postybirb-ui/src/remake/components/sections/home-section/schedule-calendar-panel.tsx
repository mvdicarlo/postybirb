/**
 * ScheduleCalendarPanel - Mini calendar showing scheduled submissions.
 * Displays a month view with indicators for days with scheduled posts.
 */

import { msg, Trans } from '@lingui/react/macro';
import { useLingui } from '@lingui/react';
import {
  ActionIcon,
  Box,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import {
  IconCalendarEvent,
  IconChevronLeft,
  IconChevronRight,
} from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { useScheduledSubmissions } from '../../../stores/submission-store';
import { useDrawerActions } from '../../../stores/ui-store';

/**
 * Get weekday abbreviations for calendar header.
 */
function useWeekdays() {
  const { _ } = useLingui();
  return useMemo(
    () => [
      { key: 'sun', label: _(msg`Su`) },
      { key: 'mon', label: _(msg`Mo`) },
      { key: 'tue', label: _(msg`Tu`) },
      { key: 'wed', label: _(msg`We`) },
      { key: 'thu', label: _(msg`Th`) },
      { key: 'fri', label: _(msg`Fr`) },
      { key: 'sat', label: _(msg`Sa`) },
    ],
    [_]
  );
}

/**
 * Day cell data for the calendar grid.
 */
type DayCell = { type: 'empty'; position: number } | { type: 'day'; date: Date };

/**
 * Get all days in a month as a grid (includes padding days from prev/next month).
 */
function getMonthDays(year: number, month: number): DayCell[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startDayOfWeek = firstDay.getDay();

  const days: DayCell[] = [];

  // Padding for days before the first of the month
  for (let i = 0; i < startDayOfWeek; i++) {
    days.push({ type: 'empty', position: i });
  }

  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    days.push({ type: 'day', date: new Date(year, month, day) });
  }

  return days;
}

/**
 * Check if two dates are the same day.
 */
function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Format month name.
 */
function formatMonth(date: Date): string {
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

/**
 * ScheduleCalendarPanel component.
 * Shows a mini month calendar with scheduled submission indicators.
 */
export function ScheduleCalendarPanel() {
  const scheduledSubmissions = useScheduledSubmissions();
  const { openDrawer } = useDrawerActions();
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const weekdays = useWeekdays();

  // Get scheduled dates for the current month
  const scheduledDates = useMemo(() => {
    const dates = new Map<string, number>();
    scheduledSubmissions.forEach((s) => {
      if (s.schedule.scheduledFor) {
        const date = new Date(s.schedule.scheduledFor);
        const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
        dates.set(key, (dates.get(key) ?? 0) + 1);
      }
    });
    return dates;
  }, [scheduledSubmissions]);

  const days = useMemo(
    () => getMonthDays(currentMonth.getFullYear(), currentMonth.getMonth()),
    [currentMonth]
  );

  const today = new Date();

  const handlePrevMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleOpenScheduleDrawer = () => {
    openDrawer('schedule');
  };

  return (
    <Paper withBorder p="md" radius="md" h="100%">
      <Stack gap="sm" h="100%">
        {/* Header */}
        <Group justify="space-between">
          <Group gap="xs">
            <ThemeIcon size="md" variant="light" color="violet" radius="md">
              <IconCalendarEvent size={16} />
            </ThemeIcon>
            <Text size="sm" fw={500}>
              <Trans>Schedule</Trans>
            </Text>
          </Group>
          <UnstyledButton onClick={handleOpenScheduleDrawer}>
            <Text size="xs" c="dimmed" style={{ textDecoration: 'underline' }}>
              <Trans>Open full calendar</Trans>
            </Text>
          </UnstyledButton>
        </Group>

        {/* Month Navigation */}
        <Group justify="space-between" align="center">
          <ActionIcon variant="subtle" size="sm" onClick={handlePrevMonth}>
            <IconChevronLeft size={16} />
          </ActionIcon>
          <Text size="sm" fw={500}>
            {formatMonth(currentMonth)}
          </Text>
          <ActionIcon variant="subtle" size="sm" onClick={handleNextMonth}>
            <IconChevronRight size={16} />
          </ActionIcon>
        </Group>

        {/* Weekday Headers */}
        <SimpleGrid cols={7} spacing={2}>
          {weekdays.map((day) => (
            <Text key={day.key} size="xs" c="dimmed" ta="center" fw={500}>
              {day.label}
            </Text>
          ))}
        </SimpleGrid>

        {/* Calendar Grid */}
        <SimpleGrid cols={7} spacing={2}>
          {days.map((cell) => {
            if (cell.type === 'empty') {
              return (
                <Box
                  key={`empty-${currentMonth.getFullYear()}-${currentMonth.getMonth()}-${cell.position}`}
                  h={32}
                />
              );
            }

            const { date } = cell;
            const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
            const count = scheduledDates.get(key) ?? 0;
            const isToday = isSameDay(date, today);

            const dayContent = (
              <Tooltip
                label={count > 0 ? count : undefined}
                withArrow
                position="top"
                disabled={count === 0}
              >
                <Box
                  h={32}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 'var(--mantine-radius-sm)',
                    backgroundColor: isToday
                      ? 'var(--mantine-color-violet-light)'
                      : undefined,
                    gap: 2,
                  }}
                >
                  <Text
                    size="xs"
                    fw={isToday ? 700 : 400}
                    c={isToday ? 'violet' : undefined}
                  >
                    {date.getDate()}
                  </Text>
                  {count > 0 && (
                    <Box
                      w={6}
                      h={6}
                      style={{
                        borderRadius: '50%',
                        backgroundColor: 'var(--mantine-color-violet-6)',
                      }}
                    />
                  )}
                </Box>
              </Tooltip>
            );

            return <Box key={key}>{dayContent}</Box>;
          })}
        </SimpleGrid>

        {/* Legend */}
        <Group gap="xs" justify="center">
          <Group gap={4}>
            <Box
              w={8}
              h={8}
              style={{
                borderRadius: '50%',
                backgroundColor: 'var(--mantine-color-violet-6)',
              }}
            />
            <Text size="xs" c="dimmed">
              <Trans>Scheduled</Trans>
            </Text>
          </Group>
        </Group>
      </Stack>
    </Paper>
  );
}
