import { Trans, useLingui } from '@lingui/react/macro';
import {
  Accordion,
  Badge,
  Box,
  Button,
  Card,
  CopyButton,
  Flex,
  Group,
  Input,
  MantineColor,
  Paper,
  ScrollArea,
  Stack,
  Table,
  Text,
  Textarea,
  Timeline,
  Title,
} from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import {
  EntityId,
  IAccountDto,
  IPostRecord,
  IWebsitePostRecord,
  NullAccount,
  PostRecordState,
  SubmissionId,
  SubmissionType,
} from '@postybirb/types';
import {
  IconCheck,
  IconCopy,
  IconDeviceFloppy,
  IconExternalLink,
  IconPlus,
  IconSearch,
  IconSend,
  IconX,
} from '@tabler/icons-react';
import { uniq } from 'lodash';
import { useMemo, useState } from 'react';
import submissionApi from '../../../api/submission.api';
import { SubmissionDto } from '../../../models/dtos/submission.dto';
import { AccountStore } from '../../../stores/account.store';
import { SubmissionStore } from '../../../stores/submission.store';
import { useStore } from '../../../stores/use-store';
import { ExternalLink } from '../../external-link/external-link';
import { DeleteActionPopover } from '../../shared/delete-action-popover/delete-action-popover';

type SubmissionViewProps = {
  type: SubmissionType;
  submissions?: SubmissionDto[];
};

function getAccount(
  accountId: EntityId | undefined,
  accountsMap: Map<EntityId, IAccountDto>,
): IAccountDto {
  return accountsMap.get(accountId || '') || (new NullAccount() as IAccountDto);
}

/**
 * Organizes submissions by date for display
 */
function bucketizeSubmissionsByPostDate(submissions: SubmissionDto[]) {
  const buckets: Record<
    string, // Date unix ts
    Record<SubmissionId, { submission: SubmissionDto }>
  > = {};

  submissions.forEach((submission) => {
    const latestPost = submission.posts.sort(
      (a, b) =>
        new Date(b.completedAt ?? b.createdAt).getTime() -
        new Date(a.completedAt ?? a.createdAt).getTime(),
    )[0];

    if (!latestPost) return;

    const date = new Date(latestPost.completedAt ?? latestPost.createdAt);
    const dateAtStartOfDay = new Date(date);
    dateAtStartOfDay.setHours(0, 0, 0, 0);
    const key = dateAtStartOfDay.getTime();

    if (!buckets[key]) {
      buckets[key] = {};
    }

    buckets[key][submission.id] = { submission };
  });

  return Object.entries(buckets).sort(([a], [b]) => Number(b) - Number(a));
}

/**
 * Exports post record to a file
 */
function exportPostRecordToFile(post: IPostRecord) {
  const jsonString = JSON.stringify(post, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  // Generate a filename with post ID and date
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
 * Renders a website post entry row
 */
function WebsitePostRow({
  post,
  accountsMap,
}: {
  post: IWebsitePostRecord;
  accountsMap: Map<EntityId, IAccountDto>;
}) {
  const isSuccess = post.errors.length === 0 && post.completedAt;
  const sourceUrls = post.metadata.source
    ? [post.metadata.source]
    : uniq(Object.values(post.metadata.sourceMap)).filter(Boolean);
  const account = getAccount(post.accountId, accountsMap);

  return (
    <Table.Tr key={post.id}>
      <Table.Td>
        <strong>
          {account.name} ({account.website})
        </strong>
      </Table.Td>
      <Table.Td>
        {isSuccess ? (
          <Badge color="green" variant="outline" size="sm">
            <Trans>Success</Trans>
          </Badge>
        ) : (
          <Badge color="red">
            <Trans>Failed</Trans>
          </Badge>
        )}
      </Table.Td>
      <Table.Td>
        {sourceUrls.length ? (
          <Group>
            {sourceUrls.map((sourceUrl) => (
              <ExternalLink href={sourceUrl} key={sourceUrl}>
                {sourceUrl}
                <IconExternalLink
                  size="1rem"
                  style={{ verticalAlign: 'middle' }}
                />
              </ExternalLink>
            ))}
          </Group>
        ) : null}
        {!isSuccess && post.errors.length > 0 && (
          <Badge
            color="red"
            title={post.errors.map((err) => err.message).join('\n')}
          >
            <Trans>Error</Trans>
          </Badge>
        )}
      </Table.Td>
    </Table.Tr>
  );
}

/**
 * Displays details of a post record
 */
function PostDetailsView({ post }: { post: IPostRecord | null }) {
  const { t } = useLingui();
  const { map: accountsMap } = useStore(AccountStore);

  if (!post) {
    return (
      <Text c="dimmed" ta="center" mt="md">
        <Trans>Select a post to view details</Trans>
      </Text>
    );
  }

  const formattedJson = JSON.stringify(post, null, 2);

  const handleSaveToFile = () => {
    const filename = exportPostRecordToFile(post);
    showNotification({
      title: t`File saved`,
      message: filename,
      color: 'green',
    });
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
                <Trans>URL</Trans>
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
                    <Trans>No website posts available</Trans>
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
            <Group>
              <IconDeviceFloppy size={16} />
              <Text fw={500}>
                <Trans>Post Record</Trans>
              </Text>
            </Group>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack>
              <Group justify="flex-end">
                <CopyButton value={formattedJson} timeout={2000}>
                  {({ copied, copy }) => (
                    <Button
                      color={copied ? 'teal' : 'blue'}
                      onClick={copy}
                      leftSection={<IconCopy size={16} />}
                      size="xs"
                    >
                      {copied ? (
                        <Trans>Copied</Trans>
                      ) : (
                        <Trans>Copy to clipboard</Trans>
                      )}
                    </Button>
                  )}
                </CopyButton>
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
 * Renders a timeline item for a post
 */
function PostTimelineItem({
  post,
  isActive,
  accountsMap,
  onSelect,
}: {
  post: IPostRecord;
  isActive: boolean;
  accountsMap: Map<EntityId, IAccountDto>;
  onSelect: (post: IPostRecord) => void;
}) {
  const completedAt = new Date(
    post.completedAt ?? post.createdAt,
  ).toLocaleString();

  let color: MantineColor = 'grey';
  let bullet = <IconSend />;

  if (post.state === PostRecordState.DONE) {
    color = 'green';
    bullet = <IconCheck color="var(--mantine-color-green-5)" />;
  } else if (post.state === PostRecordState.FAILED) {
    color = 'red';
    bullet = <IconX color="var(--mantine-color-red-5)" />;
  }

  return (
    <Timeline.Item
      style={{ cursor: 'pointer' }}
      onClickCapture={() => onSelect(post)}
      key={post.id}
      title={
        <Text fw={isActive ? 500 : undefined}>
          <Trans>Post</Trans>
        </Text>
      }
      c={color}
      bullet={bullet}
    >
      <Group gap="xs">
        {post.children.map((child) => {
          const account = getAccount(child.accountId, accountsMap);
          const displayName = account?.websiteInfo?.websiteDisplayName;
          return (
            <Badge
              size="xs"
              variant="outline"
              color={child.errors.length ? 'red' : 'green'}
              key={child.id}
            >
              {displayName ?? <Trans>Unknown</Trans>} ({account?.name})
            </Badge>
          );
        })}
      </Group>
      <Text size="xs" c="dimmed">
        {completedAt}
      </Text>
    </Timeline.Item>
  );
}

/**
 * Card displaying submission history
 */
function SubmissionHistoryCard({ submission }: { submission: SubmissionDto }) {
  const { t } = useLingui();
  const { map: accountsMap } = useStore(AccountStore);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const descendingPosts = useMemo(
    () =>
      submission.posts.sort(
        (a, b) =>
          new Date(b.completedAt ?? b.createdAt).getTime() -
          new Date(a.completedAt ?? a.createdAt).getTime(),
      ),
    [submission.posts],
  );

  const [activePost, setActivePost] = useState<IPostRecord | null>(
    descendingPosts[0],
  );

  const handleUnarchive = async () => {
    try {
      setIsRestoring(true);
      await submissionApi.unarchive(submission.id);
      showNotification({
        title: t`Submission restored`,
        message: submission.getDefaultOptions().data.title,
        color: 'green',
        icon: <IconCheck size={16} />,
      });
    } catch (error) {
      showNotification({
        title: t`Restore failed`,
        message: String(error),
        color: 'red',
        icon: <IconX size={16} />,
      });
    } finally {
      setIsRestoring(false);
    }
  };

  const handleDeleteSubmission = async () => {
    try {
      setIsDeleting(true);
      await submissionApi.remove([submission.id]);
      showNotification({
        title: t`Submission deleted`,
        message: submission.getDefaultOptions().data.title,
        color: 'green',
        icon: <IconCheck size={16} />,
      });
    } catch (error) {
      showNotification({
        title: t`Delete failed`,
        message: String(error),
        color: 'red',
        icon: <IconX size={16} />,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card key={submission.id} shadow="sm" radius="md" pt="0" withBorder ml="lg">
      <Group justify="space-between" mt="md" mb="xs">
        <Text fw={500}>{submission.getDefaultOptions().data.title}</Text>
        <Group gap="xs">
          <Button
            size="xs"
            variant="light"
            onClick={handleUnarchive}
            leftSection={<IconDeviceFloppy size="1rem" />}
            loading={isRestoring}
            disabled={
              isRestoring || submission.isArchived === false || isDeleting
            }
          >
            <Trans>Restore</Trans>
          </Button>

          {submission.isArchived && (
            <DeleteActionPopover
              disabled={isDeleting || isRestoring}
              onDelete={handleDeleteSubmission}
            />
          )}
        </Group>
      </Group>
      <Flex>
        <Box>
          <ScrollArea h={250} pr="md">
            <Timeline>
              {descendingPosts.map((post) => (
                <PostTimelineItem
                  key={post.id}
                  post={post}
                  isActive={post === activePost}
                  accountsMap={accountsMap}
                  onSelect={setActivePost}
                />
              ))}
              <Timeline.Item
                key={submission.id}
                bullet={<IconPlus />}
                title={
                  <Text fw={500}>
                    <Trans>Created</Trans>
                  </Text>
                }
              >
                <Text size="xs" c="dimmed">
                  {new Date(submission.createdAt).toLocaleString()}
                </Text>
              </Timeline.Item>
            </Timeline>
          </ScrollArea>
        </Box>
        <Box mx="sm" flex={10}>
          <PostDetailsView post={activePost} />
        </Box>
      </Flex>
    </Card>
  );
}

/**
 * Main submission history view component
 */
export function SubmissionHistoryView({
  type,
  submissions: providedSubmissions,
}: SubmissionViewProps) {
  const { t } = useLingui();
  const { state: storeSubmissions } = useStore(SubmissionStore);
  const [nameFilter, setNameFilter] = useState<string>('');

  const submissions = providedSubmissions || storeSubmissions;

  const filteredSubmissions = useMemo(() => {
    let results = submissions.filter(
      (submission) => submission.type === type && submission.posts.length > 0,
    );

    if (nameFilter.trim().length > 0) {
      const searchTerm = nameFilter.toLowerCase();
      results = results.filter((submission) =>
        submission
          .getDefaultOptions()
          .data.title?.toLowerCase()
          .includes(searchTerm),
      );
    }

    return results;
  }, [submissions, type, nameFilter]);

  const buckets = useMemo(
    () => bucketizeSubmissionsByPostDate(filteredSubmissions),
    [filteredSubmissions],
  );

  const renderHistoryItems = () => {
    if (buckets.length === 0) {
      return (
        <Box p="md" ta="center">
          <Trans>No history available</Trans>
        </Box>
      );
    }

    return buckets.map(([date, postedSubmission]) => {
      const time = new Date(Number(date));
      const cards = Object.entries(postedSubmission).map(([id, record]) => (
        <SubmissionHistoryCard key={id} submission={record.submission} />
      ));

      return (
        <Stack key={time.toISOString()}>
          <Title order={4}>{time.toLocaleDateString()}</Title>
          {cards}
        </Stack>
      );
    });
  };

  return (
    <Stack>
      <Box>
        <Paper shadow="xs" p="xs">
          <Flex align="center">
            <Input
              flex="6"
              placeholder={t`Search`}
              width="100%"
              leftSection={<IconSearch />}
              value={nameFilter}
              onChange={(event) => setNameFilter(event.currentTarget.value)}
            />
          </Flex>
        </Paper>
      </Box>
      <Box>{renderHistoryItems()}</Box>
    </Stack>
  );
}
