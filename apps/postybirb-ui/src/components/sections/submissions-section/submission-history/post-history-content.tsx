/**
 * PostHistoryContent - Reusable post history display for a submission's post
 * and its units of work. Used both inline in the submission edit card and in
 * the history drawer.
 */

import { Trans } from '@lingui/react/macro';
import {
  Accordion,
  Badge,
  Button,
  Card,
  Group,
  Stack,
  Text,
  Textarea,
} from '@mantine/core';
import { IconDeviceFloppy } from '@tabler/icons-react';
import { useMemo } from 'react';
import { useLocale } from '../../../../hooks';
import { SubmissionRecord, useAccountsMap } from '../../../../stores';
import { EmptyState } from '../../../empty-state';
import { CopyToClipboard } from '../../../shared/copy-to-clipboard';
import { AccountUnitGroup } from './account-unit-group';
import { buildPostDebugJson, exportPostToFile } from './post-export';

interface PostHistoryContentProps {
  submission: SubmissionRecord;
}

function PostStateBadge({ submission }: PostHistoryContentProps) {
  const { post } = submission;
  if (!post) return null;

  if (post.cancelled) {
    return (
      <Badge size="sm" variant="light" color="gray">
        <Trans>Cancelled</Trans>
      </Badge>
    );
  }

  if (post.completed) {
    return (
      <Badge size="sm" variant="light" color="green">
        <Trans>Completed</Trans>
      </Badge>
    );
  }

  return (
    <Badge size="sm" variant="light" color="blue">
      <Trans>In progress</Trans>
    </Badge>
  );
}

function StatValue({
  value,
  label,
  color,
}: {
  value: number;
  label: React.ReactNode;
  color?: string;
}) {
  return (
    <Stack gap={0} align="center">
      <Text size="xl" fw={700} c={color}>
        {value}
      </Text>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
    </Stack>
  );
}

/**
 * Displays submission post history: a stats summary and a per-account breakdown
 * of every unit of work, including superseded ones.
 */
export function PostHistoryContent({ submission }: PostHistoryContentProps) {
  const accountsMap = useAccountsMap();
  const { formatDateTime } = useLocale();

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

  const debugJson = useMemo(
    () => buildPostDebugJson(submission),
    [submission],
  );

  const stats = submission.unitStats;
  const { post } = submission;

  if (!post) {
    return <EmptyState preset="no-records" size="sm" />;
  }

  return (
    <Stack gap="md">
      <Card withBorder p="sm">
        <Stack gap="sm">
          <Group justify="space-between" wrap="nowrap">
            <Text size="sm" c="dimmed">
              {formatDateTime(post.createdAt)}
            </Text>
            <PostStateBadge submission={submission} />
          </Group>
          <Group justify="space-around">
            <StatValue value={stats.total} label={<Trans>Total</Trans>} />
            <StatValue
              value={stats.succeeded}
              label={<Trans>Succeeded</Trans>}
              color="green"
            />
            <StatValue
              value={stats.failed}
              label={<Trans>Failed</Trans>}
              color="red"
            />
            {stats.running > 0 && (
              <StatValue
                value={stats.running}
                label={<Trans>Running</Trans>}
                color="blue"
              />
            )}
            {stats.rateLimited > 0 && (
              <StatValue
                value={stats.rateLimited}
                label={<Trans>Rate limited</Trans>}
                color="yellow"
              />
            )}
            {stats.cancelled > 0 && (
              <StatValue
                value={stats.cancelled}
                label={<Trans>Cancelled</Trans>}
                color="gray"
              />
            )}
          </Group>
        </Stack>
      </Card>

      {sortedGroups.length === 0 ? (
        <EmptyState preset="no-records" size="sm" />
      ) : (
        <Accordion variant="separated">
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

      <Accordion variant="contained">
        <Accordion.Item value="json-data">
          <Accordion.Control>
            <Group gap="xs">
              <IconDeviceFloppy size={16} />
              <Text fw={500}>
                <Trans>Post Data (JSON)</Trans>
              </Text>
            </Group>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack>
              <Group justify="flex-end">
                <CopyToClipboard
                  value={debugJson}
                  variant="button"
                  size="xs"
                  color="blue"
                />
                <Button
                  size="xs"
                  variant="light"
                  leftSection={<IconDeviceFloppy size={14} />}
                  onClick={() => exportPostToFile(submission)}
                >
                  <Trans>Save to file</Trans>
                </Button>
              </Group>
              <Textarea
                readOnly
                autosize
                minRows={5}
                maxRows={15}
                value={debugJson}
                styles={{ input: { fontFamily: 'monospace' } }}
              />
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Stack>
  );
}
