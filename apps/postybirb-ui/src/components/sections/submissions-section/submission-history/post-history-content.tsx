/**
 * PostHistoryContent - Reusable post history display for a submission's post
 * and its units of work. Used both inline in the submission edit card and in
 * the history drawer.
 */

import { Trans, useLingui } from '@lingui/react/macro';
import {
  Accordion,
  ActionIcon,
  Badge,
  Group,
  Progress,
  Stack,
  Text,
  Textarea,
  Tooltip,
} from '@mantine/core';
import {
  IconAlertCircle,
  IconCheck,
  IconCircleCheck,
  IconClock,
  IconCode,
  IconDownload,
  IconLoader2,
  IconPlayerStop,
  IconStack2,
} from '@tabler/icons-react';
import { useMemo } from 'react';
import { useLocale } from '../../../../hooks';
import { SubmissionRecord, useAccountsMap } from '../../../../stores';
import { EmptyState } from '../../../empty-state';
import { CopyToClipboard } from '../../../shared/copy-to-clipboard';
import { AccountUnitGroup } from './account-unit-group';
import { buildPostDebugJson, exportPostToFile } from './post-export';
import './post-history.css';

interface PostHistoryContentProps {
  submission: SubmissionRecord;
}

function PostStateBadge({ submission }: PostHistoryContentProps) {
  const { post } = submission;
  if (!post) return null;

  if (post.cancelled) {
    return (
      <Badge
        size="md"
        radius="sm"
        tt="none"
        variant="light"
        color="gray"
        leftSection={<IconPlayerStop size={12} />}
      >
        <Trans>Cancelled</Trans>
      </Badge>
    );
  }

  if (post.completed && submission.unitStats.failed > 0) {
    return (
      <Badge
        size="md"
        radius="sm"
        tt="none"
        variant="light"
        color="red"
        leftSection={<IconAlertCircle size={12} />}
      >
        <Trans>Completed with errors</Trans>
      </Badge>
    );
  }

  if (post.completed) {
    return (
      <Badge
        size="md"
        radius="sm"
        tt="none"
        variant="light"
        color="green"
        leftSection={<IconCheck size={12} />}
      >
        <Trans>Completed</Trans>
      </Badge>
    );
  }

  return (
    <Badge
      size="md"
      radius="sm"
      tt="none"
      variant="light"
      color="blue"
      leftSection={<IconLoader2 size={12} />}
    >
      <Trans>In progress</Trans>
    </Badge>
  );
}

function StatValue({
  value,
  label,
  color,
  icon,
}: {
  value: number;
  label: React.ReactNode;
  color?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="post-history-stat">
      <Text className="post-history-stat-value" fw={600} c={color}>
        {value}
      </Text>
      <Group
        gap={5}
        wrap="nowrap"
        c="dimmed"
        className="post-history-stat-label"
      >
        {icon}
        <Text size="xs">{label}</Text>
      </Group>
    </div>
  );
}

/**
 * Displays submission post history: a stats summary and a per-account breakdown
 * of every unit of work, including superseded ones.
 */
export function PostHistoryContent({ submission }: PostHistoryContentProps) {
  const accountsMap = useAccountsMap();
  const { formatDateTime } = useLocale();
  const { t } = useLingui();

  const accountGroups = useMemo(
    () => Array.from(submission.unitsOfWorkByAccount.entries()),
    [submission],
  );

  const sortedGroups = useMemo(
    () =>
      [...accountGroups].sort(([a], [b]) => {
        const aName = accountsMap.get(a)?.websiteDisplayName ?? a;
        const bName = accountsMap.get(b)?.websiteDisplayName ?? b;
        return aName.localeCompare(bName);
      }),
    [accountGroups, accountsMap],
  );

  const debugJson = useMemo(() => buildPostDebugJson(submission), [submission]);

  const stats = submission.unitStats;
  const { post } = submission;
  const remaining = Math.max(
    0,
    stats.total - stats.succeeded - stats.failed - stats.cancelled,
  );
  const waiting = Math.max(0, remaining - stats.running - stats.rateLimited);

  if (!post) {
    return <EmptyState preset="no-records" size="sm" />;
  }

  return (
    <Stack gap="lg" className="post-history">
      <section className="post-history-summary" aria-label={t`Posting summary`}>
        <Group justify="space-between" gap="sm" align="flex-start">
          <Stack gap={3}>
            <Text size="sm" fw={600}>
              <Trans>Posting summary</Trans>
            </Text>
            <Text
              size="xs"
              c="dimmed"
              component="time"
              dateTime={post.createdAt}
            >
              {formatDateTime(post.createdAt)}
            </Text>
          </Stack>
          <PostStateBadge submission={submission} />
        </Group>
        <div className="post-history-stats">
          <StatValue
            value={stats.total}
            label={<Trans>Total</Trans>}
            icon={<IconStack2 size={14} />}
          />
          <StatValue
            value={stats.succeeded}
            label={<Trans>Succeeded</Trans>}
            color="green"
            icon={<IconCircleCheck size={14} />}
          />
          <StatValue
            value={stats.failed}
            label={<Trans>Failed</Trans>}
            color={stats.failed > 0 ? 'red' : undefined}
            icon={<IconAlertCircle size={14} />}
          />
          <StatValue
            value={remaining}
            label={<Trans>Remaining</Trans>}
            icon={<IconClock size={14} />}
          />
        </div>
        {stats.total > 0 && (
          <Progress.Root size={6} radius="xs" aria-label={t`Posting outcomes`}>
            <Progress.Section
              value={(stats.succeeded / stats.total) * 100}
              color="green"
              aria-label={t`Succeeded`}
            />
            <Progress.Section
              value={(stats.failed / stats.total) * 100}
              color="red"
              aria-label={t`Failed`}
            />
            <Progress.Section
              value={(stats.running / stats.total) * 100}
              color="blue"
              aria-label={t`Running`}
            />
            <Progress.Section
              value={(stats.rateLimited / stats.total) * 100}
              color="yellow"
              aria-label={t`Rate limited`}
            />
            <Progress.Section
              value={(stats.cancelled / stats.total) * 100}
              color="gray"
              aria-label={t`Cancelled`}
            />
          </Progress.Root>
        )}
        {(remaining > 0 || stats.cancelled > 0) && (
          <Group gap="md" mt="xs">
            {stats.running > 0 && (
              <Text size="xs" c="blue">
                <Trans>{stats.running} running</Trans>
              </Text>
            )}
            {waiting > 0 && (
              <Text size="xs" c="dimmed">
                <Trans>{waiting} waiting</Trans>
              </Text>
            )}
            {stats.rateLimited > 0 && (
              <Text size="xs" c="dimmed">
                <Trans>{stats.rateLimited} rate limited</Trans>
              </Text>
            )}
            {stats.cancelled > 0 && (
              <Text size="xs" c="dimmed">
                <Trans>{stats.cancelled} cancelled</Trans>
              </Text>
            )}
          </Group>
        )}
      </section>
      <Stack gap="sm">
        <Group gap="xs">
          <Text size="sm" fw={600}>
            <Trans>Account activity</Trans>
          </Text>
          <Badge size="sm" variant="light" color="gray">
            {sortedGroups.length}
          </Badge>
        </Group>
        {sortedGroups.length === 0 ? (
          <EmptyState preset="no-records" size="sm" />
        ) : (
          <Accordion
            multiple
            variant="default"
            className="post-history-accounts"
            defaultValue={sortedGroups
              .slice(0, 1)
              .map(([accountId]) => accountId)}
          >
            {sortedGroups.map(([accountId, units]) => (
              <AccountUnitGroup
                key={accountId}
                accountId={accountId}
                units={units}
                submission={submission}
                account={accountsMap.get(accountId)}
              />
            ))}
          </Accordion>
        )}
      </Stack>
      <Accordion variant="default" className="post-history-debug">
        <Accordion.Item value="json-data">
          <Accordion.Control>
            <Group gap="xs">
              <IconCode size={16} />
              <Text size="xs" fw={500}>
                <Trans>Post data (JSON)</Trans>
              </Text>
            </Group>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack>
              <Group justify="flex-end" gap="xs">
                <CopyToClipboard value={debugJson} variant="button" size="xs" />
                <Tooltip label={<Trans>Download JSON</Trans>}>
                  <ActionIcon
                    size="sm"
                    variant="subtle"
                    aria-label={t`Download JSON`}
                    onClick={() => exportPostToFile(submission)}
                  >
                    <IconDownload size={16} />
                  </ActionIcon>
                </Tooltip>
              </Group>
              <Textarea
                readOnly
                autosize
                minRows={5}
                maxRows={15}
                value={debugJson}
                aria-label={t`Post data (JSON)`}
                styles={{
                  input: {
                    fontFamily: 'var(--mantine-font-family-monospace)',
                    fontSize: 'var(--mantine-font-size-xs)',
                  },
                }}
              />
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Stack>
  );
}
