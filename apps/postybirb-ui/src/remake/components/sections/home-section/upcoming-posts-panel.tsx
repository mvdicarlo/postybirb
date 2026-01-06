/**
 * UpcomingPostsPanel - Panel showing the next scheduled submissions.
 * Displays up to 5 upcoming posts with relative times.
 */

import { t } from '@lingui/core/macro';
import { useLingui } from '@lingui/react';
import { Trans } from '@lingui/react/macro';
import { Box, Group, Paper, Stack, Text, ThemeIcon } from '@mantine/core';
import { SubmissionType } from '@postybirb/types';
import { IconCalendarEvent, IconClock } from '@tabler/icons-react';
import { useCallback, useMemo } from 'react';
import { useLocale } from '../../../hooks';
import { useViewStateActions } from '../../../stores/navigation-store';
import { useScheduledSubmissions } from '../../../stores/submission-store';
import { EmptyState } from '../../empty-state';

/**
 * UpcomingPostsPanel component.
 * Shows the next 5 scheduled submissions sorted by scheduled date.
 */
export function UpcomingPostsPanel() {
  const { _ } = useLingui();
  const scheduledSubmissions = useScheduledSubmissions();
  const { formatRelativeTime, formatDateTime } = useLocale();
  const { setViewState } = useViewStateActions();

  const handleNavigateToSubmission = useCallback(
    (id: string, type: SubmissionType) => {
      if (type === SubmissionType.FILE) {
        setViewState({
          type: 'file-submissions',
          params: {
            selectedIds: [id],
            mode: 'single',
            submissionType: SubmissionType.FILE,
          },
        });
      } else {
        setViewState({
          type: 'message-submissions',
          params: {
            selectedIds: [id],
            mode: 'single',
            submissionType: SubmissionType.MESSAGE,
          },
        });
      }
    },
    [setViewState],
  );

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
          <Box style={{ alignItems: 'center' }}>
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
                style={{ cursor: 'pointer' }}
                onClick={() =>
                  handleNavigateToSubmission(submission.id, submission.type)
                }
              >
                <Group justify="space-between" wrap="nowrap">
                  <Box style={{ minWidth: 0, flex: 1 }}>
                    <Text size="sm" truncate fw={500}>
                      {submission.title || t`Untitled`}
                    </Text>
                    <Group gap={4}>
                      <IconClock size={12} style={{ opacity: 0.6 }} />
                      <Text size="xs" c="dimmed">
                        {formatDateTime(
                          submission.schedule.scheduledFor as string,
                        )}
                      </Text>
                    </Group>
                  </Box>
                  <Text size="xs" c="violet" fw={500}>
                    {formatRelativeTime(
                      submission.schedule.scheduledFor as string,
                    )}
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
