/**
 * SubmissionHistoryDrawer - Drawer component displaying post history for a submission.
 * Shows expandable cards of posts, success/failure status, and exportable JSON data.
 */

import { Trans } from '@lingui/react/macro';
import {
    Accordion,
    Badge,
    Button,
    Drawer,
    Group,
    ScrollArea,
    Stack,
    Table,
    Text,
    Textarea,
} from '@mantine/core';
import {
    EntityId,
    IPostRecord,
    IWebsitePostRecord,
    PostRecordState,
} from '@postybirb/types';
import {
    IconCheck,
    IconDeviceFloppy,
    IconExternalLink,
    IconHistory,
    IconLink,
    IconX,
} from '@tabler/icons-react';
import { uniq } from 'lodash';
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
 * Get account by ID from accounts map.
 */
function getAccount(
  accountId: EntityId | undefined,
  accountsMap: Map<EntityId, AccountRecord>,
): AccountRecord | undefined {
  return accountsMap.get(accountId || '');
}

/**
 * Export post record to a JSON file.
 */
function exportPostRecordToFile(post: IPostRecord): string {
  const jsonString = JSON.stringify(post, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  const date = new Date(post.createdAt);
  const formattedDate = date.toISOString().split('T')[0];
  const filename = `post-record-${post.id}-${formattedDate}.json`;

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return filename;
}

/**
 * Renders a row for a website post entry.
 */
function WebsitePostRow({
  post,
  accountsMap,
}: {
  post: IWebsitePostRecord;
  accountsMap: Map<EntityId, AccountRecord>;
}) {
  const isSuccess = post.errors.length === 0 && post.completedAt;
  const sourceUrls = post.metadata.source
    ? [post.metadata.source]
    : uniq(Object.values(post.metadata.sourceMap)).filter(Boolean);
  const account = getAccount(post.accountId, accountsMap);

  return (
    <Table.Tr>
      <Table.Td>
        <strong>
          {account?.name ?? <Trans>Unknown</Trans>} ({account?.website ?? '?'})
        </strong>
      </Table.Td>
      <Table.Td>
        {isSuccess ? (
          <Badge color="green" variant="outline" size="sm">
            <Trans>Success</Trans>
          </Badge>
        ) : (
          <Badge color="red" size="sm">
            <Trans>Failed</Trans>
          </Badge>
        )}
      </Table.Td>
      <Table.Td>
        {sourceUrls.length > 0 ? (
          <Group gap="xs">
            {sourceUrls.map((sourceUrl) => (
              <ExternalLink href={sourceUrl} key={sourceUrl}>
                <Group gap={4}>
                  {sourceUrl.length > 40
                    ? `${sourceUrl.substring(0, 40)}...`
                    : sourceUrl}
                  <IconExternalLink size="0.875rem" />
                </Group>
              </ExternalLink>
            ))}
          </Group>
        ) : null}
        {!isSuccess && post.errors.length > 0 && (
          <Text size="xs" c="red">
            {post.errors.map((err) => err.message).join(', ')}
          </Text>
        )}
      </Table.Td>
    </Table.Tr>
  );
}

/**
 * Displays details for a post record inside an accordion panel.
 */
function PostDetailsPanel({
  post,
  accountsMap,
}: {
  post: IPostRecord;
  accountsMap: Map<EntityId, AccountRecord>;
}) {
  const formattedJson = JSON.stringify(post, null, 2);

  const handleSaveToFile = () => {
    exportPostRecordToFile(post);
  };

  return (
    <Stack>
      <ScrollArea>
        <Table striped>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>
                <Trans>Account</Trans>
              </Table.Th>
              <Table.Th>
                <Trans>Status</Trans>
              </Table.Th>
              <Table.Th>
                <IconLink size="1rem" />
              </Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {post.children.map((child) => (
              <WebsitePostRow
                key={child.id}
                post={child}
                accountsMap={accountsMap}
              />
            ))}
            {post.children.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={3} style={{ textAlign: 'center' }}>
                  <Text c="dimmed">
                    <Trans>No posts found</Trans>
                  </Text>
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </ScrollArea>

      <Accordion variant="contained">
        <Accordion.Item value="json-data">
          <Accordion.Control>
            <Group gap="xs">
              <IconDeviceFloppy size={16} />
              <Text fw={500}>
                <Trans>Post Record (JSON)</Trans>
              </Text>
            </Group>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack>
              <Group justify="flex-end">
                <CopyToClipboard value={formattedJson} variant="button" size="xs" color="blue" />
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
  );
}

/**
 * Card for a single post record with expandable details.
 */
function PostCard({
  post,
  accountsMap,
}: {
  post: IPostRecord;
  accountsMap: Map<EntityId, AccountRecord>;
}) {
  const { formatDateTime } = useLocale();
  const completedAt = formatDateTime(
    new Date(post.completedAt ?? post.createdAt)
  );

  const isSuccess = post.state === PostRecordState.DONE;
  const isFailed = post.state === PostRecordState.FAILED;

  const successCount = post.children.filter((c) => c.errors.length === 0).length;
  const failedCount = post.children.filter((c) => c.errors.length > 0).length;

  return (
    <Accordion.Item value={post.id}>
      <Accordion.Control>
        <Group justify="space-between" wrap="nowrap" pr="xs">
          <Group gap="xs">
            {isSuccess && <IconCheck size={16} color="var(--mantine-color-green-5)" />}
            {isFailed && <IconX size={16} color="var(--mantine-color-red-5)" />}
            <Text size="sm" fw={500}>
              {completedAt}
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
          </Group>
        </Group>
      </Accordion.Control>
      <Accordion.Panel>
        <PostDetailsPanel post={post} accountsMap={accountsMap} />
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

  const descendingPosts = useMemo(() => {
    if (!submission) return [];
    return [...submission.posts].sort(
      (a, b) =>
        new Date(b.completedAt ?? b.createdAt).getTime() -
        new Date(a.completedAt ?? a.createdAt).getTime(),
    );
  }, [submission]);

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
        {descendingPosts.length === 0 ? (
          <Text c="dimmed" ta="center" mt="xl">
            <Trans>No post history available</Trans>
          </Text>
        ) : (
          <Accordion variant="separated">
            {descendingPosts.map((post) => (
              <PostCard key={post.id} post={post} accountsMap={accountsMap} />
            ))}
          </Accordion>
        )}
      </ScrollArea>
    </Drawer>
  );
}
