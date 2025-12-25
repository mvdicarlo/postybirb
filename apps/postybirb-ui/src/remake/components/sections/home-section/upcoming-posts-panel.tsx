/**
 * UpcomingPostsPanel - Panel showing the next scheduled submissions.
 * Displays up to 5 upcoming posts with relative times.
 */

import { msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react';
import { Trans } from '@lingui/react/macro';
import {
  Box,
  Group,
  Paper,
  Stack,
  Text,
  ThemeIcon,
} from '@mantine/core';
import { IconCalendarEvent, IconClock } from '@tabler/icons-react';
import { useMemo } from 'react';
import { useScheduledSubmissions } from '../../../stores/submission-store';
import { EmptyState } from '../../empty-state';

/**
 * Format a date as relative time (e.g., "in 2 hours", "tomorrow").
 */
function useFormatRelativeTime() {
  const { _ } = useLingui();
  
  return (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffMins = Math.round(diffMs / (1000 * 60));
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 0) {
      return _(msg`Past due`);
    }
    if (diffMins < 60) {
      return _(msg`in ${diffMins} min`);
    }
    if (diffHours < 24) {
      return _(msg`in ${diffHours} hour(s)`);
    }
    if (diffDays === 1) {
      return _(msg`tomorrow`);
    }
    if (diffDays < 7) {
      return _(msg`in ${diffDays} days`);
    }
    return date.toLocaleDateString();
  };
}

/**
 * Format a date for display.
 */
function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * UpcomingPostsPanel component.
 * Shows the next 5 scheduled submissions sorted by scheduled date.
 */
export function UpcomingPostsPanel() {
  const { _ } = useLingui();
  const scheduledSubmissions = useScheduledSubmissions();
  const formatRelativeTime = useFormatRelativeTime();

  const upcomingPosts = useMemo(() => {
    const now = new Date();
    return [...scheduledSubmissions]
      .filter((s) => {
        if (!s.schedule.scheduledFor) return false;
        // Only include future posts (not past due)
        const scheduledDate = new Date(s.schedule.scheduledFor);
        return scheduledDate > now;
      })
      .sort((a, b) => {
        // Safe to cast - we filtered out items without scheduledFor above
        const dateA = new Date(a.schedule.scheduledFor as string);
        const dateB = new Date(b.schedule.scheduledFor as string);
        return dateA.getTime() - dateB.getTime();
      })
      .slice(0, 5);
  }, [scheduledSubmissions]);

  return (
    <Paper withBorder p="md" radius="md" h="100%">
      <Stack gap="sm" h="100%">
        <Group gap="xs">
          <ThemeIcon size="md" variant="light" color="violet" radius="md">
            <IconCalendarEvent size={16} />
          </ThemeIcon>
          <Text size="sm" fw={500}>
            <Trans>Upcoming Posts</Trans>
          </Text>
        </Group>

        {upcomingPosts.length === 0 ? (
          <Box style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
            <EmptyState
              preset="no-records"
              message={<Trans>No scheduled posts</Trans>}
              description={<Trans>Schedule a submission to see it here</Trans>}
              size="sm"
            />
          </Box>
        ) : (
          <Stack gap="xs">
            {upcomingPosts.map((submission) => (
              <Paper
                key={submission.id}
                withBorder
                p="xs"
                radius="sm"
                bg="var(--mantine-color-default)"
              >
                <Group justify="space-between" wrap="nowrap">
                  <Box style={{ minWidth: 0, flex: 1 }}>
                    <Text size="sm" truncate fw={500}>
                      {submission.metadata.displayName || _(msg`Untitled`)}
                    </Text>
                    <Group gap={4}>
                      <IconClock size={12} style={{ opacity: 0.6 }} />
                      <Text size="xs" c="dimmed">
                        {formatDateTime(submission.schedule.scheduledFor as string)}
                      </Text>
                    </Group>
                  </Box>
                  <Text size="xs" c="violet" fw={500}>
                    {formatRelativeTime(submission.schedule.scheduledFor as string)}
                  </Text>
                </Group>
              </Paper>
            ))}
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}
