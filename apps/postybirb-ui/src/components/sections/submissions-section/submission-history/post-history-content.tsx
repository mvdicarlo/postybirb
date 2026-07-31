/**
 * PostHistoryContent - Reusable post history display (stats + post record accordion).
 * Used both inline in the submission edit card and in the history drawer.
 */

import { Trans } from '@lingui/react/macro';
import { Accordion, Card, Group, Stack, Text } from '@mantine/core';
import { useMemo } from 'react';
import { SubmissionRecord, useAccountsMap } from '../../../../stores';
import { EmptyState } from '../../../empty-state';
import { PostRecordCard } from './post-record-card';

interface PostHistoryContentProps {
  submission: SubmissionRecord;
}

/**
 * Displays submission post history: stats summary card and accordion of post records.
 * Does not include any Drawer/ScrollArea wrapper — caller is responsible for layout.
 */
export function PostHistoryContent({ submission }: PostHistoryContentProps) {
  const accountsMap = useAccountsMap();

  const descendingRecords = useMemo(
    () => submission.sortedPostsDescending,
    [submission],
  );

  const stats = submission.postingStats;

  return (
    <Stack gap="md">
      {/* Stats Summary */}
      {stats && stats.totalAttempts > 0 && (
        <Card withBorder p="sm">
          <Group justify="space-around">
            <Stack gap={0} align="center">
              <Text size="xl" fw={700}>
                {stats.totalAttempts}
              </Text>
              <Text size="xs" c="dimmed">
                <Trans>Total</Trans>
              </Text>
            </Stack>
            <Stack gap={0} align="center">
              <Text size="xl" fw={700} c="green">
                {stats.successfulAttempts}
              </Text>
              <Text size="xs" c="dimmed">
                <Trans>Successful</Trans>
              </Text>
            </Stack>
            <Stack gap={0} align="center">
              <Text size="xl" fw={700} c="red">
                {stats.failedAttempts}
              </Text>
              <Text size="xs" c="dimmed">
                <Trans>Failed</Trans>
              </Text>
            </Stack>
            {stats.runningAttempts > 0 && (
              <Stack gap={0} align="center">
                <Text size="xl" fw={700} c="blue">
                  {stats.runningAttempts}
                </Text>
                <Text size="xs" c="dimmed">
                  <Trans>Running</Trans>
                </Text>
              </Stack>
            )}
          </Group>
        </Card>
      )}

      {descendingRecords.length === 0 ? (
        <EmptyState preset="no-records" size="sm" />
      ) : (
        <Accordion variant="separated">
          {descendingRecords.map((record) => (
            <PostRecordCard
              key={record.id}
              record={record}
              accountsMap={accountsMap}
            />
          ))}
        </Accordion>
      )}
    </Stack>
  );
}
