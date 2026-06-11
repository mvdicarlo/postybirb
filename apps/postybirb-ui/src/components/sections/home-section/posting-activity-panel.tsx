/**
 *  dashboard panel showing live posting activity.PostingActivityPanel 
 *
 * Active posts render as Relay job trees (live via POST_STATE_DELTA + the
 * /post/jobs/active snapshot). Queued submissions that are not yet posting
 * render as lightweight cards with a cancel action.
 */

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
import { SubmissionType } from '@postybirb/types';
import { IconPlayerStop, IconSend } from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import postQueueApi from '../../../api/post-queue.api';
import { useQueuedSubmissions } from '../../../stores/entity/submission-store';
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
  const [isCancelling, setIsCancelling] = useState(false);

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
    <Paper withBorder p="xs" radius="sm" bg="var(--mantine-color-default)">
      <Group justify="space-between" wrap="nowrap">
        <Group gap="xs" style={{ minWidth: 0, flex: 1 }}>
          <Badge size="xs" variant="light" color="gray" circle>
            {position}
          </Badge>
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
                <JobTreeView job={job} />
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
