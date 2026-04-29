/**
 * PostingActivityPanel - Dashboard panel showing live posting queue
 * and per-website posting progress.
 *
 * Shows:
 * - Actively posting submissions with per-account status rows
 * - Queued submissions waiting to be posted
 * - Rate-limit wait countdowns (via ephemeral WebSocket + API)
 * - File batch progress for file submissions
 */

import { Trans } from '@lingui/react/macro';
import {
  ActionIcon,
  Badge,
  Box,
  Group,
  Paper,
  Progress,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
} from '@mantine/core';
import {
  EntityId,
  IPostWaitState,
  PostEventType,
  PostRecordState,
  SubmissionType,
} from '@postybirb/types';
import {
  IconCheck,
  IconClock,
  IconLoader,
  IconPlayerStop,
  IconSend,
  IconX,
} from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import postQueueApi from '../../../api/post-queue.api';
import { useQueuedSubmissions } from '../../../stores/entity/submission-store';
import type { SubmissionRecord } from '../../../stores/records';
import { useViewStateActions } from '../../../stores/ui/navigation-store';
import {
  useWaitStateActions,
  useWaitStates,
} from '../../../stores/ui/wait-state-store';
import {
  createFileSubmissionsViewState,
  createMessageSubmissionsViewState,
} from '../../../types/view-state';
import {
  type AccountPostStatusEntry,
  getAccountPostStatusMap,
} from '../submissions-section/submission-history';

// =============================================================================
// Helpers
// =============================================================================

function getStatusColor(status: AccountPostStatusEntry['status']): string {
  switch (status) {
    case 'success':
      return 'green';
    case 'failed':
      return 'red';
    case 'running':
      return 'blue';
    case 'rate-limited':
      return 'orange';
    case 'waiting':
    default:
      return 'gray';
  }
}

function getStatusIcon(
  status: AccountPostStatusEntry['status'],
): React.ReactNode {
  switch (status) {
    case 'success':
      return <IconCheck size={12} />;
    case 'failed':
      return <IconX size={12} />;
    case 'running':
      return <IconLoader size={12} />;
    case 'rate-limited':
      return <IconClock size={12} />;
    case 'waiting':
    default:
      return null;
  }
}

/**
 * Format a remaining time in ms to a human string like "4m 30s".
 */
function formatRemainingTime(ms: number): string {
  // eslint-disable-next-line lingui/no-unlocalized-strings
  if (ms <= 0) return '< 1s';
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) {
    // eslint-disable-next-line lingui/no-unlocalized-strings
    return `${minutes}m ${seconds}s`;
  }
  // eslint-disable-next-line lingui/no-unlocalized-strings
  return `${seconds}s`;
}

/**
 * Get file progress from post events for a submission.
 */
function getFileProgress(submission: SubmissionRecord): {
  posted: number;
  failed: number;
  total: number;
} | null {
  if (submission.type !== SubmissionType.FILE) return null;

  const totalFiles = submission.files.length;
  if (totalFiles === 0) return null;

  const { latestPost } = submission;
  if (!latestPost?.events) return { posted: 0, failed: 0, total: totalFiles };

  const posted = new Set<string>();
  const failed = new Set<string>();

  for (const event of latestPost.events) {
    if (event.fileId) {
      if (event.eventType === PostEventType.FILE_POSTED) {
        posted.add(event.fileId);
      } else if (event.eventType === PostEventType.FILE_FAILED) {
        failed.add(event.fileId);
      }
    }
  }

  return { posted: posted.size, failed: failed.size, total: totalFiles };
}

// =============================================================================
// Sub-components
// =============================================================================

/**
 * Countdown display for a rate-limited wait state.
 */
function WaitCountdown({ waitUntil }: { waitUntil: string }) {
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, new Date(waitUntil).getTime() - Date.now()),
  );

  useEffect(() => {
    const interval = setInterval(() => {
      const r = Math.max(0, new Date(waitUntil).getTime() - Date.now());
      setRemaining(r);
      if (r <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [waitUntil]);

  if (remaining <= 0) return null;

  return (
    <Text size="xs" c="orange.6" fw={500}>
      {formatRemainingTime(remaining)}
    </Text>
  );
}

/**
 * Per-account status row inside an active posting card.
 */
function AccountStatusRow({
  accountId,
  entry,
  waitState,
}: {
  accountId: EntityId;
  entry: AccountPostStatusEntry;
  waitState?: IPostWaitState;
}) {
  const effectiveStatus = waitState ? 'rate-limited' : entry.status;
  const color = getStatusColor(effectiveStatus);
  const icon = getStatusIcon(effectiveStatus);

  // Use wait state website name or fall back to account snapshot
  const displayName = waitState?.websiteName ?? accountId;

  return (
    <Group gap="xs" wrap="nowrap">
      {icon && (
        <ThemeIcon size={18} variant="light" color={color} radius="xl">
          {icon}
        </ThemeIcon>
      )}
      <Text size="xs" style={{ flex: 1, minWidth: 0 }} truncate>
        {displayName}
      </Text>
      {effectiveStatus === 'rate-limited' && waitState && (
        <WaitCountdown waitUntil={waitState.waitUntil} />
      )}
      {effectiveStatus === 'failed' && entry.errors.length > 0 && (
        <Tooltip label={entry.errors.join(' | ')} multiline w={300} withArrow>
          <Text size="xs" c="red.6" style={{ cursor: 'help' }}>
            <Trans>Error</Trans>
          </Text>
        </Tooltip>
      )}
    </Group>
  );
}

/**
 * Card for an actively posting submission.
 */
function ActivePostCard({
  submission,
  waitStates,
}: {
  submission: SubmissionRecord;
  waitStates: IPostWaitState[];
}) {
  const { setViewState } = useViewStateActions();
  const accountStatusMap = useMemo(
    () => getAccountPostStatusMap(submission),
    [submission],
  );

  const waitStateMap = useMemo(() => {
    const map = new Map<EntityId, IPostWaitState>();
    for (const ws of waitStates) {
      if (ws.submissionId === submission.id) {
        map.set(ws.accountId, ws);
      }
    }
    return map;
  }, [waitStates, submission.id]);

  // Progress calculation
  const totalAccounts = accountStatusMap.size;
  const completedAccounts = Array.from(accountStatusMap.values()).filter(
    (e) => e.status === 'success' || e.status === 'failed',
  ).length;
  const progressPercent =
    totalAccounts > 0
      ? Math.round((completedAccounts / totalAccounts) * 100)
      : 0;

  // File progress
  const fileProgress = getFileProgress(submission);

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

  return (
    <Paper withBorder p="xs" radius="sm" bg="var(--mantine-color-default)">
      <Stack gap="xs">
        {/* Header */}
        <Group justify="space-between" wrap="nowrap">
          <Group gap="xs" style={{ minWidth: 0, flex: 1 }}>
            <Badge size="xs" variant="light" color="blue">
              <Trans>Posting</Trans>
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
              fw={500}
              truncate
              style={{ cursor: 'pointer', minWidth: 0, flex: 1 }}
              onClick={handleNavigate}
              td="underline"
              c="blue.6"
            >
              {submission.title || <Trans>Untitled</Trans>}
            </Text>
          </Group>
        </Group>

        {/* Progress bar */}
        <Tooltip
          // eslint-disable-next-line lingui/no-unlocalized-strings
          label={`${completedAccounts} / ${totalAccounts} accounts`}
          withArrow
        >
          <Progress
            value={progressPercent}
            size="sm"
            radius="xl"
            color={progressPercent === 100 ? 'green' : 'blue'}
            animated={progressPercent < 100}
          />
        </Tooltip>

        {/* File progress */}
        {fileProgress && (
          <Text size="xs" c="dimmed">
            {/* eslint-disable-next-line lingui/no-unlocalized-strings */}
            {`${fileProgress.posted}/${fileProgress.total} files posted`}
            {fileProgress.failed > 0 && (
              <Text span c="red.6">
                {/* eslint-disable-next-line lingui/no-unlocalized-strings */}
                {` (${fileProgress.failed} failed)`}
              </Text>
            )}
          </Text>
        )}

        {/* Per-account status rows */}
        <Stack gap={4}>
          {Array.from(accountStatusMap.entries()).map(([accountId, entry]) => (
            <AccountStatusRow
              key={accountId}
              accountId={accountId}
              entry={entry}
              waitState={waitStateMap.get(accountId)}
            />
          ))}
        </Stack>
      </Stack>
    </Paper>
  );
}

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

// =============================================================================
// Main Panel
// =============================================================================

/**
 * PostingActivityPanel component.
 * Renders only when there are queued or actively posting submissions.
 */
export function PostingActivityPanel() {
  const queuedSubmissions = useQueuedSubmissions();
  const waitStates = useWaitStates();
  const { fetchWaitStates, pruneExpired } = useWaitStateActions();

  // Fetch wait states on mount (for page reload resilience)
  useEffect(() => {
    fetchWaitStates();
  }, [fetchWaitStates]);

  // Prune expired wait states periodically
  useEffect(() => {
    const interval = setInterval(pruneExpired, 5000);
    return () => clearInterval(interval);
  }, [pruneExpired]);

  // Split into active (RUNNING) and queued (PENDING or no post record)
  const { active, queued } = useMemo(() => {
    const activeList: SubmissionRecord[] = [];
    const queuedList: SubmissionRecord[] = [];

    for (const sub of queuedSubmissions) {
      const { latestPost } = sub;
      if (latestPost?.state === PostRecordState.RUNNING) {
        activeList.push(sub);
      } else {
        queuedList.push(sub);
      }
    }

    return { active: activeList, queued: queuedList };
  }, [queuedSubmissions]);

  // Don't render if nothing to show
  if (active.length === 0 && queued.length === 0) {
    return null;
  }

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
          {active.length + queued.length > 0 && (
            <Badge size="xs" variant="light" color="blue">
              {active.length + queued.length}
            </Badge>
          )}
        </Group>

        {/* Active posts */}
        {active.length > 0 && (
          <Stack gap="xs">
            {active.map((sub) => (
              <ActivePostCard
                key={sub.id}
                submission={sub}
                waitStates={waitStates}
              />
            ))}
          </Stack>
        )}

        {/* Queued posts */}
        {queued.length > 0 && (
          <Box>
            {active.length > 0 && (
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
