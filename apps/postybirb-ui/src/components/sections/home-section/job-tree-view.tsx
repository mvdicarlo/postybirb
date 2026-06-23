/**
 * JobTreeView — renders a Relay {@link JobTreeNode} (job → task → unit) for the
 * live posting UI. Pure presentational component; data comes from the
 * posting-state store (snapshot + POST_STATE_DELTA).
 */

import { Trans } from '@lingui/react/macro';
import {
  Badge,
  Box,
  Group,
  Progress,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
} from '@mantine/core';
import { JobTreeNode } from '@postybirb/types';
import {
  IconAlertTriangle,
  IconCheck,
  IconClock,
  IconExternalLink,
  IconHourglassLow,
  IconLoader2,
  IconMinus,
  IconX,
} from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useAccountsMap } from '../../../stores/entity/account-store';
import { ExternalLink } from '../../shared/external-link';
import classes from './job-tree-view.module.css';

type NodeStatus = JobTreeNode['status'];

function statusColor(status: NodeStatus): string {
  switch (status) {
    case 'SUCCEEDED':
      return 'green';
    case 'FAILED':
      return 'red';
    case 'RUNNING':
      return 'blue';
    case 'WAITING':
      return 'orange';
    case 'CANCELLED':
      return 'red';
    case 'SKIPPED':
      return 'gray';
    case 'QUEUED':
    case 'READY':
    default:
      return 'gray';
  }
}

function statusIcon(status: NodeStatus): ReactNode {
  switch (status) {
    case 'SUCCEEDED':
      return <IconCheck size={12} />;
    case 'FAILED':
    case 'CANCELLED':
      return <IconX size={12} />;
    case 'RUNNING':
      return <IconLoader2 size={12} />;
    case 'WAITING':
      return <IconClock size={12} />;
    case 'SKIPPED':
      return <IconMinus size={12} />;
    case 'QUEUED':
    case 'READY':
      return <IconHourglassLow size={12} />;
    default:
      return null;
  }
}

/** Human-friendly, title-cased status label (e.g. "SUCCEEDED" → "Succeeded"). */
function humanizeStatus(status: NodeStatus): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

/** A status icon inside a colored chip; spins while the node is RUNNING. */
function StatusIcon({ status }: { status: NodeStatus }) {
  const icon = statusIcon(status);
  if (!icon) return null;
  return (
    <ThemeIcon size={18} variant="light" color={statusColor(status)} radius="xl">
      {status === 'RUNNING' ? <span className={classes.spin}>{icon}</span> : icon}
    </ThemeIcon>
  );
}

function formatRemaining(ms: number): string {
  // eslint-disable-next-line lingui/no-unlocalized-strings
  if (ms <= 0) return '< 1s';
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  // eslint-disable-next-line lingui/no-unlocalized-strings
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

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
    <Tooltip
      label={<Trans>Waiting on a rate-limit or dependency</Trans>}
      withArrow
    >
      <Badge
        size="sm"
        radius="sm"
        variant="light"
        color="orange"
        leftSection={<IconClock size={11} />}
        styles={{ label: { fontVariantNumeric: 'tabular-nums' } }}
      >
        {formatRemaining(remaining)}
      </Badge>
    </Tooltip>
  );
}

function NodeRow({ node }: { node: JobTreeNode }) {
  const accountsMap = useAccountsMap();
  const { label: nodeLabel } = node;
  let label: string = nodeLabel;
  if (node.kind === 'task' && node.accountId) {
    const account = accountsMap.get(node.accountId);
    if (account) {
      const { websiteDisplayName, name } = account;
      // eslint-disable-next-line lingui/no-unlocalized-strings
      label = `${websiteDisplayName} - ${name}`;
    }
  }
  return (
    <Group className={classes.row} gap="xs" wrap="nowrap" align="center">
      <StatusIcon status={node.status} />
      <Tooltip label={label} openDelay={500} withArrow position="top-start">
        <Text
          size="xs"
          fw={node.kind === 'task' ? 500 : 400}
          style={{ flex: 1, minWidth: 0 }}
          truncate
        >
          {label}
        </Text>
      </Tooltip>
      {node.progress && (
        <Badge size="sm" radius="sm" variant="default" c="dimmed">
          {/* eslint-disable-next-line lingui/no-unlocalized-strings */}
          {`${node.progress.done}/${node.progress.total}`}
        </Badge>
      )}
      {node.waitingUntil && <WaitCountdown waitUntil={node.waitingUntil} />}
      {node.sourceUrl && (
        <ExternalLink href={node.sourceUrl}>
          <Group gap={4} wrap="nowrap">
            <Text size="xs" c="blue.6" fw={500}>
              <Trans>View</Trans>
            </Text>
            <IconExternalLink
              size="0.75rem"
              color="var(--mantine-color-blue-6)"
            />
          </Group>
        </ExternalLink>
      )}
      {node.error && (
        <Tooltip
          label={`${node.error.kind} @ ${node.error.stage}: ${node.error.message}`}
          multiline
          w={300}
          withArrow
        >
          <Badge
            size="sm"
            radius="sm"
            variant="light"
            color="red"
            leftSection={<IconAlertTriangle size={11} />}
            style={{ cursor: 'help' }}
          >
            <Trans>Error</Trans>
          </Badge>
        </Tooltip>
      )}
    </Group>
  );
}

function TreeNode({ node, depth }: { node: JobTreeNode; depth: number }) {
  return (
    <Box>
      <NodeRow node={node} />
      {node.children && node.children.length > 0 && (
        <Stack gap={1} mt={1} className={classes.children}>
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </Stack>
      )}
    </Box>
  );
}

/**
 * Render a single job tree as a card-friendly block. An optional `headerLabel`
 * overrides the job's raw label (a submission id) with caller-supplied context
 * such as an attempt number.
 */
export function JobTreeView({
  job,
  headerLabel,
}: {
  job: JobTreeNode;
  headerLabel?: ReactNode;
}) {
  const color = statusColor(job.status);
  const percent =
    job.progress && job.progress.total > 0
      ? Math.round((job.progress.done / job.progress.total) * 100)
      : 0;
  return (
    <Stack gap="xs">
      <Group gap="xs" wrap="nowrap" align="center">
        <Badge
          size="sm"
          variant="light"
          color={color}
          leftSection={<StatusIcon status={job.status} />}
          styles={{ section: { marginRight: 4 } }}
        >
          {humanizeStatus(job.status)}
        </Badge>
        <Text size="sm" fw={500} truncate style={{ flex: 1, minWidth: 0 }}>
          {headerLabel ?? job.label}
        </Text>
        {job.progress && (
          <Text
            size="xs"
            c="dimmed"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {/* eslint-disable-next-line lingui/no-unlocalized-strings */}
            {`${job.progress.done}/${job.progress.total}`}
          </Text>
        )}
      </Group>
      {job.progress && job.progress.total > 0 && (
        <Tooltip
          // eslint-disable-next-line lingui/no-unlocalized-strings
          label={`${percent}%`}
          withArrow
        >
          <Progress
            value={percent}
            size="sm"
            radius="xl"
            color={color}
            striped={job.status === 'RUNNING'}
            animated={job.status === 'RUNNING'}
          />
        </Tooltip>
      )}
      <Stack gap={2}>
        {(job.children ?? []).map((task) => (
          <TreeNode key={task.id} node={task} depth={0} />
        ))}
      </Stack>
    </Stack>
  );
}
