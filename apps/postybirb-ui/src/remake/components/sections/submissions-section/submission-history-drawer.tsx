/**
 * SubmissionHistoryDrawer - Drawer component displaying post history for a submission.
 * Shows expandable cards of post records, success/failure status, and exportable JSON data.
 */

import { Trans } from '@lingui/react/macro';
import {
  Accordion,
  ActionIcon,
  Badge,
  Button,
  Card,
  Divider,
  Drawer,
  Group,
  ScrollArea,
  Stack,
  Table,
  Text,
  Textarea,
  Tooltip,
} from '@mantine/core';
import {
  EntityId,
  PostEventDto,
  PostEventType,
  PostRecordDto,
  PostRecordState,
} from '@postybirb/types';
import {
  IconCheck,
  IconDeviceFloppy,
  IconExternalLink,
  IconHistory,
  IconInfoCircle,
  IconLoader,
  IconX,
} from '@tabler/icons-react';
import { useMemo } from 'react';
import { useLocale } from '../../../hooks';
import {
  AccountRecord,
  SubmissionRecord,
  useAccountsMap,
} from '../../../stores';
import { CopyToClipboard } from '../../shared/copy-to-clipboard';
import { ExternalLink } from '../../shared/external-link';

interface SubmissionHistoryDrawerProps {
  /** Whether the drawer is open */
  opened: boolean;
  /** Handler to close the drawer */
  onClose: () => void;
  /** The submission to display history for */
  submission: SubmissionRecord | null;
}

/**
 * Derived website post information from events.
 */
interface DerivedWebsitePost {
  accountId: EntityId;
  accountName: string;
  websiteName: string;
  isSuccess: boolean;
  sourceUrls: string[];
  errors: string[];
}

/**
 * Extract website post results from post events.
 * Aggregates events per account to determine success/failure and source URLs.
 */
function extractWebsitePostsFromEvents(
  events: PostEventDto[] | undefined,
): DerivedWebsitePost[] {
  if (!events || events.length === 0) return [];

  const postsByAccount = new Map<EntityId, DerivedWebsitePost>();

  for (const event of events) {
    if (!event.accountId) continue;

    // Get or create post entry for this account
    let post = postsByAccount.get(event.accountId);
    if (!post) {
      const accountSnapshot = event.metadata?.accountSnapshot;
      post = {
        accountId: event.accountId,
        // eslint-disable-next-line lingui/no-unlocalized-strings
        accountName: accountSnapshot?.name ?? 'Unknown',
        // eslint-disable-next-line lingui/no-unlocalized-strings
        websiteName: accountSnapshot?.website ?? '?',
        isSuccess: false,
        sourceUrls: [],
        errors: [],
      };
      postsByAccount.set(event.accountId, post);
    }

    // Process event based on type
    switch (event.eventType) {
      case PostEventType.POST_ATTEMPT_COMPLETED:
        post.isSuccess = true;
        break;

      case PostEventType.POST_ATTEMPT_FAILED:
        post.isSuccess = false;
        if (event.error?.message) {
          post.errors.push(event.error.message);
        }
        break;

      case PostEventType.MESSAGE_POSTED:
      case PostEventType.FILE_POSTED:
        if (event.sourceUrl) {
          post.sourceUrls.push(event.sourceUrl);
        }
        break;

      case PostEventType.MESSAGE_FAILED:
      case PostEventType.FILE_FAILED:
        if (event.error?.message) {
          post.errors.push(event.error.message);
        }
        break;

      default:
        break;
    }
  }

  return Array.from(postsByAccount.values());
}

/**
 * Export post record to a JSON file.
 */
function exportPostRecordToFile(record: PostRecordDto): string {
  const jsonString = JSON.stringify(record, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  const formattedDate = new Date(record.createdAt).toISOString().split('T')[0];
  const filename = `post-record-${record.id}-${formattedDate}.json`;

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return filename;
}

/**
 * Format duration in human-readable format.
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    // eslint-disable-next-line lingui/no-unlocalized-strings
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    // eslint-disable-next-line lingui/no-unlocalized-strings
    return `${minutes}m ${seconds % 60}s`;
  }
  if (seconds < 1) {
    // eslint-disable-next-line lingui/no-unlocalized-strings
    return '< 1s';
  }
  // eslint-disable-next-line lingui/no-unlocalized-strings
  return `${seconds}s`;
}

/**
 * Get icon for post record state.
 */
function getStateIcon(state: PostRecordState): React.ReactNode {
  switch (state) {
    case PostRecordState.DONE:
      return <IconCheck size={16} color="var(--mantine-color-green-5)" />;
    case PostRecordState.FAILED:
      return <IconX size={16} color="var(--mantine-color-red-5)" />;
    case PostRecordState.RUNNING:
      return <IconLoader size={16} color="var(--mantine-color-blue-5)" />;
    case PostRecordState.PENDING:
    default:
      return null;
  }
}

/**
 * Displays an individual post record.
 */
function PostRecordCard({
  record,
  accountsMap,
}: {
  record: PostRecordDto;
  accountsMap: Map<EntityId, AccountRecord>;
}) {
  const { formatDateTime } = useLocale();
  const formattedJson = JSON.stringify(record, null, 2);

  const handleSaveToFile = () => {
    exportPostRecordToFile(record);
  };

  // Extract website posts from events
  const websitePosts = extractWebsitePostsFromEvents(record.events);
  const successCount = websitePosts.filter((p) => p.isSuccess).length;
  const failedCount = websitePosts.length - successCount;

  // Calculate duration if completed
  const startedAt = new Date(record.createdAt);
  const completedAt = record.completedAt ? new Date(record.completedAt) : null;
  const duration = completedAt
    ? completedAt.getTime() - startedAt.getTime()
    : null;

  return (
    <Accordion.Item value={record.id}>
      <Accordion.Control>
        <Group justify="space-between" wrap="nowrap" pr="xs">
          <Group gap="xs">
            {getStateIcon(record.state)}
            <Text size="sm" fw={500}>
              {formatDateTime(startedAt)}
            </Text>
          </Group>
          <Group gap="xs">
            {successCount > 0 && (
              <Badge size="sm" color="green" variant="light">
                {successCount} <Trans>success</Trans>
              </Badge>
            )}
            {failedCount > 0 && (
              <Badge size="sm" color="red" variant="light">
                {failedCount} <Trans>failed</Trans>
              </Badge>
            )}
            {duration && (
              <Badge size="sm" variant="outline" color="gray">
                {formatDuration(duration)}
              </Badge>
            )}
          </Group>
        </Group>
      </Accordion.Control>
      <Accordion.Panel>
        <Stack gap="md">
          {/* Posts table */}
          {websitePosts.length > 0 && (
            <Table striped highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>
                    <Trans>Website</Trans>
                  </Table.Th>
                  <Table.Th>
                    <Trans>Account</Trans>
                  </Table.Th>
                  <Table.Th>
                    <Trans>Status</Trans>
                  </Table.Th>
                  <Table.Th>
                    <Trans>Source URL</Trans>
                  </Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {websitePosts.map((post) => {
                  const account = accountsMap.get(post.accountId);
                  return (
                    <Table.Tr key={post.accountId}>
                      <Table.Td>
                        <Text size="sm">
                          {account?.websiteInfo?.websiteDisplayName ??
                            post.websiteName}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" fw={500}>
                          {account?.name ?? post.accountName}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        {post.isSuccess ? (
                          <Group gap="xs">
                            <IconCheck
                              size={16}
                              color="var(--mantine-color-green-6)"
                            />
                            <Text size="sm" c="green.7">
                              <Trans>Success</Trans>
                            </Text>
                          </Group>
                        ) : (
                          <Group gap="xs">
                            <IconX
                              size={16}
                              color="var(--mantine-color-red-6)"
                            />
                            <Text size="sm" c="red.7">
                              <Trans>Failed</Trans>
                            </Text>
                            {post.errors.length > 0 && (
                              <Tooltip
                                label={post.errors.join(' | ')}
                                multiline
                                w={300}
                                withArrow
                              >
                                <ActionIcon
                                  size="xs"
                                  variant="subtle"
                                  color="red"
                                >
                                  <IconInfoCircle size={14} />
                                </ActionIcon>
                              </Tooltip>
                            )}
                          </Group>
                        )}
                      </Table.Td>
                      <Table.Td>
                        {post.sourceUrls.length > 0 ? (
                          <Stack gap="xs">
                            {post.sourceUrls.map((url) => (
                              <ExternalLink href={url} key={url}>
                                <Group gap={4}>
                                  <IconExternalLink size="0.75rem" />
                                  <Text size="xs" c="blue.6" td="underline">
                                    <Trans>View</Trans>
                                  </Text>
                                </Group>
                              </ExternalLink>
                            ))}
                          </Stack>
                        ) : (
                          <Text size="xs" c="dimmed">
                            -
                          </Text>
                        )}
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          )}

          {/* No posts message */}
          {websitePosts.length === 0 && (
            <Card withBorder p="sm" bg="yellow.0">
              <Stack gap="xs">
                <Text size="sm" fw={600}>
                  <Trans>No website posts found</Trans>
                </Text>
                <Text size="xs" c="dimmed">
                  <Trans>
                    This post record has no events or is still processing. Check
                    the JSON data below for more details.
                  </Trans>
                </Text>
              </Stack>
            </Card>
          )}

          <Divider />

          {/* JSON Export */}
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
                      value={formattedJson}
                      variant="button"
                      size="xs"
                      color="blue"
                    />
                    <Button
                      onClick={handleSaveToFile}
                      leftSection={<IconDeviceFloppy size={16} />}
                      color="green"
                      size="xs"
                    >
                      <Trans>Save to file</Trans>
                    </Button>
                  </Group>
                  <Textarea
                    readOnly
                    autosize
                    minRows={5}
                    maxRows={15}
                    value={formattedJson}
                    styles={{
                      input: { fontFamily: 'monospace', fontSize: '0.85rem' },
                    }}
                  />
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        </Stack>
      </Accordion.Panel>
    </Accordion.Item>
  );
}

/**
 * Drawer component for viewing submission post history.
 */
export function SubmissionHistoryDrawer({
  opened,
  onClose,
  submission,
}: SubmissionHistoryDrawerProps) {
  const accountsMap = useAccountsMap();

  // Get post records in descending order (newest first)
  const descendingRecords = useMemo(() => {
    if (!submission) return [];
    return submission.sortedPostsDescending;
  }, [submission]);

  // Calculate overall stats
  const stats = submission?.postingStats;

  if (!submission) {
    return null;
  }

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <IconHistory size={20} />
          <Text fw={500}>{submission.title}</Text>
        </Group>
      }
      position="right"
      size="lg"
      padding="md"
    >
      {/* eslint-disable-next-line lingui/no-unlocalized-strings */}
      <ScrollArea h="calc(100vh - 80px)">
        {/* Stats Summary */}
        {stats && stats.totalAttempts > 0 && (
          <Card withBorder mb="md" p="sm">
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
          <Text c="dimmed" ta="center" mt="xl">
            <Trans>No post history available</Trans>
          </Text>
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
      </ScrollArea>
    </Drawer>
  );
}
