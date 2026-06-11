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
    IconCheck,
    IconClock,
    IconExternalLink,
    IconLoader,
    IconMinus,
    IconX,
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useAccountsMap } from '../../../stores/entity/account-store';
import { ExternalLink } from '../../shared/external-link';

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

function statusIcon(status: NodeStatus): React.ReactNode {
  switch (status) {
    case 'SUCCEEDED':
      return <IconCheck size={12} />;
    case 'FAILED':
    case 'CANCELLED':
      return <IconX size={12} />;
    case 'RUNNING':
      return <IconLoader size={12} />;
    case 'WAITING':
      return <IconClock size={12} />;
    case 'SKIPPED':
      return <IconMinus size={12} />;
    default:
      return null;
  }
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
    <Text size="xs" c="orange.6" fw={500}>
      {formatRemaining(remaining)}
    </Text>
  );
}

function NodeRow({ node }: { node: JobTreeNode }) {
  const color = statusColor(node.status);
  const icon = statusIcon(node.status);
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
    <Group gap="xs" wrap="nowrap" align="center">
      {icon && (
        <ThemeIcon size={18} variant="light" color={color} radius="xl">
          {icon}
        </ThemeIcon>
      )}
      <Text size="xs" style={{ flex: 1, minWidth: 0 }} truncate>
        {label}
      </Text>
      {node.progress && (
        <Text size="xs" c="dimmed">
          {/* eslint-disable-next-line lingui/no-unlocalized-strings */}
          {`${node.progress.done}/${node.progress.total}`}
        </Text>
      )}
      {node.waitingUntil && <WaitCountdown waitUntil={node.waitingUntil} />}
      {node.sourceUrl && (
        <ExternalLink href={node.sourceUrl}>
          <Group gap={4} wrap="nowrap">
            <Text size="xs" c="blue.6" td="underline">
              <Trans>View</Trans>
            </Text>
            <IconExternalLink size="0.75rem" />
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
          <Text size="xs" c="red.6" style={{ cursor: 'help' }}>
            <Trans>Error</Trans>
          </Text>
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
        <Stack gap={2} mt={2} ml="md">
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </Stack>
      )}
    </Box>
  );
}

/**
 * Render a single job tree as a card-friendly block.
 */
export function JobTreeView({ job }: { job: JobTreeNode }) {
  return (
    <Stack gap="xs">
      <Group gap="xs" wrap="nowrap">
        <Badge size="xs" variant="light" color={statusColor(job.status)}>
          {job.status}
        </Badge>
        <Text size="sm" fw={500} truncate style={{ flex: 1, minWidth: 0 }}>
          {job.label}
        </Text>
        {job.progress && (
          <Text size="xs" c="dimmed">
            {/* eslint-disable-next-line lingui/no-unlocalized-strings */}
            {`${job.progress.done}/${job.progress.total}`}
          </Text>
        )}
      </Group>
      {job.progress && job.progress.total > 0 && (
        <Progress
          value={Math.round((job.progress.done / job.progress.total) * 100)}
          size="sm"
          radius="xl"
          color={statusColor(job.status)}
          animated={job.status === 'RUNNING'}
        />
      )}
      <Stack gap={4}>
        {(job.children ?? []).map((task) => (
          <TreeNode key={task.id} node={task} depth={0} />
        ))}
      </Stack>
    </Stack>
  );
}
