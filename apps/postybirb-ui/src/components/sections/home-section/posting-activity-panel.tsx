/**
 * PostingActivityPanel - dashboard panel showing live posting activity.
 *
 * Active posts render as Relay job trees (live via POST_STATE_DELTA + the
 * /post/jobs/active snapshot). Queued submissions that are not yet posting
 * render as lightweight cards with a cancel action.
 */

import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import {
  ActionIcon,
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
import { IconClock, IconPlayerStop, IconSend } from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import postQueueApi from '../../../api/post-queue.api';
import {
  useQueuedSubmissions,
  useSubmissionsMap,
} from '../../../stores/entity/submission-store';
import type { SubmissionRecord } from '../../../stores/records';
import { useViewStateActions } from '../../../stores/ui/navigation-store';
import {
  useActiveJobs,
  useActivePostingSubmissionIds,
  usePostingStateActions,
} from '../../../stores/ui/posting-state-store';
import {
  createFileSubmissionsViewState,
  createMessageSubmissionsViewState,
} from '../../../types/view-state';
import { JobTreeView } from './job-tree-view';

/**
 * Card for a queued (not yet posting) submission.
 */
function QueuedSubmissionCard({
  submission,
  position,
}: {
  submission: SubmissionRecord;
  position: number;
}) {
  const { setViewState } = useViewStateActions();
  const submissionsMap = useSubmissionsMap();
  const [isCancelling, setIsCancelling] = useState(false);

  // Prerequisites that haven't posted yet (still exist and not archived).
  // Missing dependencies are stripped server-side and don't block, so they are
  // not counted here.
  const pendingDeps = useMemo(() => {
    const ids = submission.metadata?.dependsOn ?? [];
    const result: { id: string; title: string }[] = [];
    for (const id of ids) {
      const dep = submissionsMap.get(id as SubmissionId);
      if (dep && !dep.isArchived) {
        result.push({ id, title: dep.title.trim() || t`Untitled` });
      }
    }
    return result;
  }, [submission.metadata, submissionsMap]);

  const isWaiting = pendingDeps.length > 0;

  const handleNavigate = useCallback(() => {
    if (submission.type === SubmissionType.FILE) {
      setViewState(
        createFileSubmissionsViewState({ selectedIds: [submission.id] }),
      );
    } else {
      setViewState(
        createMessageSubmissionsViewState({ selectedIds: [submission.id] }),
      );
    }
  }, [submission.id, submission.type, setViewState]);

  const handleCancel = useCallback(async () => {
    setIsCancelling(true);
    try {
      await postQueueApi.dequeue([submission.id]);
    } finally {
      setIsCancelling(false);
    }
  }, [submission.id]);

  return (
    <Paper
      withBorder
      p="xs"
      radius="sm"
      bg="var(--mantine-color-default)"
      style={
        isWaiting
          ? {
              borderLeftWidth: 3,
              borderLeftStyle: 'solid',
              borderLeftColor: 'var(--mantine-color-orange-6)',
            }
          : undefined
      }
    >
      <Group justify="space-between" wrap="nowrap" align="flex-start">
        <Group
          gap="xs"
          wrap="nowrap"
          align="flex-start"
          style={{ minWidth: 0, flex: 1 }}
        >
          <Badge size="xs" variant="light" color="gray" circle mt={2}>
            {position}
          </Badge>
          <Box style={{ minWidth: 0, flex: 1 }}>
            <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
              <Badge
                size="xs"
                variant="outline"
                color={submission.type === SubmissionType.FILE ? 'blue' : 'teal'}
              >
                {submission.type === SubmissionType.FILE ? (
                  <Trans>File</Trans>
                ) : (
                  <Trans>Message</Trans>
                )}
              </Badge>
              <Text
                size="sm"
                truncate
                style={{ cursor: 'pointer', minWidth: 0, flex: 1 }}
                onClick={handleNavigate}
                td="underline"
                c="blue.6"
              >
                {submission.title || <Trans>Untitled</Trans>}
              </Text>
            </Group>
            {isWaiting && (
              <Group gap={4} mt={4} align="center" wrap="wrap">
                <Text
                  component="span"
                  size="xs"
                  c="orange.7"
                  fw={600}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <IconClock size={12} />
                  <Trans>Waiting for</Trans>
                </Text>
                {pendingDeps.map((dep) => (
                  <Tooltip
                    key={dep.id}
                    label={t`Hasn't posted yet — this submission waits for it.`}
                    multiline
                    w={220}
                    withArrow
                  >
                    <Badge
                      size="xs"
                      variant="light"
                      color="orange"
                      radius="sm"
                      style={{
                        maxWidth: 160,
                        textTransform: 'none',
                        cursor: 'default',
                      }}
                    >
                      {dep.title}
                    </Badge>
                  </Tooltip>
                ))}
              </Group>
            )}
          </Box>
        </Group>
        <Tooltip label={<Trans>Remove from queue</Trans>} withArrow>
          <ActionIcon
            size="sm"
            variant="subtle"
            color="red"
            onClick={handleCancel}
            loading={isCancelling}
          >
            <IconPlayerStop size={14} />
          </ActionIcon>
        </Tooltip>
      </Group>
    </Paper>
  );
}

/**
 * PostingActivityPanel component.
 * Renders only when there are queued or actively posting submissions.
 */
export function PostingActivityPanel() {
  const queuedSubmissions = useQueuedSubmissions();
  const relayJobs = useActiveJobs();
  const activePostingIds = useActivePostingSubmissionIds();
  const { fetchActive } = usePostingStateActions();
  const submissionsMap = useSubmissionsMap();

  // Seed the posting-state store on mount (page reload resilience).
  useEffect(() => {
    fetchActive();
  }, [fetchActive]);

  // Queued = queued submissions that are not already posting (those render as
  // job trees above).
  const queued = useMemo(
    () => queuedSubmissions.filter((sub) => !activePostingIds.has(sub.id)),
    [queuedSubmissions, activePostingIds],
  );

  if (relayJobs.length === 0 && queued.length === 0) {
    return null;
  }

  const totalCount = relayJobs.length + queued.length;

  return (
    <Paper withBorder p="md" radius="md" data-tour-id="home-posting-activity">
      <Stack gap="sm">
        <Group gap="xs">
          <ThemeIcon size="md" variant="light" color="blue" radius="md">
            <IconSend size={16} />
          </ThemeIcon>
          <Text size="sm" fw={500}>
            <Trans>Posting Activity</Trans>
          </Text>
          {totalCount > 0 && (
            <Badge size="xs" variant="light" color="blue">
              {totalCount}
            </Badge>
          )}
        </Group>

        {/* Active posts (Relay job trees) */}
        {relayJobs.length > 0 && (
          <Stack gap="xs">
            {relayJobs.map((job) => (
              <Paper
                key={job.id}
                withBorder
                p="xs"
                radius="sm"
                bg="var(--mantine-color-default)"
              >
                <JobTreeView
                  job={job}
                  headerLabel={
                    submissionsMap.get(job.submissionId ?? '')?.title
                  }
                />
              </Paper>
            ))}
          </Stack>
        )}

        {/* Queued posts */}
        {queued.length > 0 && (
          <Box>
            {relayJobs.length > 0 && (
              <Text size="xs" c="dimmed" mb="xs" fw={500}>
                <Trans>Queue</Trans>
              </Text>
            )}
            <Stack gap="xs">
              {queued.map((sub, index) => (
                <QueuedSubmissionCard
                  key={sub.id}
                  submission={sub}
                  position={index + 1}
                />
              ))}
            </Stack>
          </Box>
        )}
      </Stack>
    </Paper>
  );
}
