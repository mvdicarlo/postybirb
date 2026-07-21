/**
 * UpcomingPostsPanel - Panel showing the next scheduled submissions.
 * Displays up to 5 upcoming posts with relative times, and flags any that are
 * waiting on a cross-submission dependency (their `dependsOn` prerequisites).
 */

import { t } from '@lingui/core/macro';
import { useLingui } from '@lingui/react';
import { Trans } from '@lingui/react/macro';
import {
  Badge,
  Box,
  Group,
  Paper,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
} from '@mantine/core';
import type { SubmissionId } from '@postybirb/types';
import { SubmissionType } from '@postybirb/types';
import { IconCalendarEvent, IconClock } from '@tabler/icons-react';
import { useCallback, useMemo } from 'react';
import { useLocale } from '../../../hooks';
import {
  useScheduledSubmissions,
  useSubmissionsMap,
} from '../../../stores/entity/submission-store';
import type { SubmissionRecord } from '../../../stores/records';
import { useViewStateActions } from '../../../stores/ui/navigation-store';
import { EmptyState } from '../../empty-state';

type DependencyChip = {
  id: string;
  title: string;
  status: 'met' | 'pending' | 'missing';
};

/**
 * UpcomingPostsPanel component.
 * Shows the next 5 scheduled submissions sorted by scheduled date.
 */
export function UpcomingPostsPanel() {
  useLingui();
  const scheduledSubmissions = useScheduledSubmissions();
  const submissionsMap = useSubmissionsMap();
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

  // Resolve a submission's `dependsOn` ids into display chips + a met/pending
  // status. A dependency is treated as "met" once it has been archived, which
  // is how the engine marks a submission after a successful (non-recurring)
  // post.
  const getDependencies = useCallback(
    (submission: SubmissionRecord): DependencyChip[] => {
      const ids = submission.metadata?.dependsOn ?? [];
      return ids.map((id) => {
        const dep = submissionsMap.get(id as SubmissionId);
        if (!dep) {
          return { id, title: t`Deleted submission`, status: 'missing' };
        }
        return {
          id,
          title: dep.title.trim() || t`Untitled`,
          status: dep.isArchived ? 'met' : 'pending',
        };
      });
    },
    [submissionsMap],
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
    <Paper withBorder p="md" radius="md" h="100%" data-tour-id="home-upcoming-posts">
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
              description={<Trans>Schedule a submission to see it here</Trans>}
              size="sm"
            />
          </Box>
        ) : (
          <Stack gap="xs">
            {upcomingPosts.map((submission) => {
              const dependencies = getDependencies(submission);
              const pendingCount = dependencies.filter(
                (d) => d.status !== 'met',
              ).length;
              return (
                <Paper
                  key={submission.id}
                  withBorder
                  p="xs"
                  radius="sm"
                  bg="var(--mantine-color-default)"
                  style={{
                    cursor: 'pointer',
                    borderLeftWidth: pendingCount > 0 ? 3 : undefined,
                    borderLeftStyle: pendingCount > 0 ? 'solid' : undefined,
                    borderLeftColor:
                      pendingCount > 0
                        ? 'var(--mantine-color-orange-6)'
                        : undefined,
                  }}
                  onClick={() =>
                    handleNavigateToSubmission(submission.id, submission.type)
                  }
                >
                  <Group justify="space-between" wrap="nowrap" align="flex-start">
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
                      {dependencies.length > 0 && (
                        <Group gap={4} mt={4} align="center" wrap="wrap">
                          <Text size="xs" c="dimmed" fw={500}>
                            <Trans>Waits for</Trans>
                          </Text>
                          {dependencies.map((dep) => (
                            <DependencyBadge key={dep.id} dependency={dep} />
                          ))}
                        </Group>
                      )}
                    </Box>
                    <Stack gap={4} align="flex-end" style={{ flexShrink: 0 }}>
                      <Text size="xs" c="violet" fw={500}>
                        {formatRelativeTime(
                          submission.schedule.scheduledFor as string,
                        )}
                      </Text>
                      {pendingCount > 0 && (
                        <Badge
                          size="xs"
                          color="orange"
                          variant="light"
                          radius="sm"
                        >
                          <Trans>Waiting</Trans>
                        </Badge>
                      )}
                    </Stack>
                  </Group>
                </Paper>
              );
            })}
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}

/** A single dependency chip, colored by whether the prerequisite has posted. */
function DependencyBadge({ dependency }: { dependency: DependencyChip }) {
  const tooltip =
    // eslint-disable-next-line no-nested-ternary
    dependency.status === 'missing'
      ? t`This dependency no longer exists and will be ignored.`
      : dependency.status === 'met'
        ? t`Already posted.`
        : t`Hasn't posted yet — this submission waits for it.`;
  // eslint-disable-next-line no-nested-ternary
  const color =
    dependency.status === 'missing'
      ? 'gray'
      : dependency.status === 'met'
        ? 'teal'
        : 'orange';
  return (
    <Tooltip label={tooltip} multiline w={200} withArrow>
      <Badge
        size="xs"
        variant="light"
        color={color}
        radius="sm"
        style={{ maxWidth: 140, textTransform: 'none', cursor: 'default' }}
      >
        {dependency.title}
      </Badge>
    </Tooltip>
  );
}
