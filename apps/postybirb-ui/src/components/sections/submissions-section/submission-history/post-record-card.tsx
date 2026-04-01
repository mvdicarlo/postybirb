/**
 * PostRecordCard - Accordion item displaying a single post record with
 * per-website results table and exportable JSON data.
 */

import { Trans } from '@lingui/react/macro';
import {
    Accordion,
    ActionIcon,
    Badge,
    Button,
    Card,
    Divider,
    Group,
    Stack,
    Table,
    Text,
    Textarea,
    Tooltip,
} from '@mantine/core';
import { EntityId, PostRecordDto, PostRecordState } from '@postybirb/types';
import {
    IconCheck,
    IconDeviceFloppy,
    IconExternalLink,
    IconInfoCircle,
    IconLoader,
    IconX,
} from '@tabler/icons-react';
import { useLocale } from '../../../../hooks';
import type { AccountRecord } from '../../../../stores/records';
import { CopyToClipboard } from '../../../shared/copy-to-clipboard';
import { ExternalLink } from '../../../shared/external-link';
import {
    exportPostRecordToFile,
    extractWebsitePostsFromEvents,
    formatDuration,
} from './history-utils';

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

interface PostRecordCardProps {
  record: PostRecordDto;
  accountsMap: Map<EntityId, AccountRecord>;
}

/**
 * Displays an individual post record as an Accordion.Item.
 */
export function PostRecordCard({ record, accountsMap }: PostRecordCardProps) {
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
