import { msg, Trans } from '@lingui/macro';
import { useLingui } from '@lingui/react';
import {
  Badge,
  Box,
  Card,
  Flex,
  Group,
  Input,
  MantineColor,
  Paper,
  ScrollArea,
  Stack,
  Text,
  Timeline,
  Title,
} from '@mantine/core';
import {
  IPostRecord,
  PostRecordState,
  SubmissionId,
  SubmissionType,
} from '@postybirb/types';
import {
  IconCheck,
  IconPlus,
  IconSearch,
  IconSend,
  IconX,
} from '@tabler/icons-react';
import { useState } from 'react';
import { SubmissionDto } from '../../../models/dtos/submission.dto';
import { SubmissionStore } from '../../../stores/submission.store';
import { useStore } from '../../../stores/use-store';

type SubmissionViewProps = {
  type: SubmissionType;
};

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
    if (!latestPost) {
      return;
    }
    const date = new Date(latestPost.completedAt ?? latestPost.createdAt);
    const dateAtStartOfDay = new Date(date);
    dateAtStartOfDay.setHours(0, 0, 0, 0);
    const key = dateAtStartOfDay.getTime();
    buckets[key] = {};
    if (!buckets[key]) {
      buckets[key] = {};
    }
    if (!buckets[key][submission.id]) {
      buckets[key][submission.id] = { submission };
    }
  });

  const sortedBuckets = Object.entries(buckets).sort(
    ([a], [b]) => Number(a) - Number(b),
  );

  return sortedBuckets;
}

// TODO - Unarchived button
// TODO - Delete button
// TODO - Coelesced post results (source urls (all joined together))
// TODO - Submission Icon
function SubmissionHistoryCard(props: { submission: SubmissionDto }) {
  const { submission } = props;
  const descendingPosts = submission.posts.sort(
    (a, b) =>
      new Date(b.completedAt ?? b.createdAt).getTime() -
      new Date(a.completedAt ?? a.createdAt).getTime(),
  );
  const [activePost, setActivePost] = useState<IPostRecord | null>(
    descendingPosts[0],
  );
  return (
    <Card key={submission.id} shadow="sm" radius="md" pt="0" withBorder ml="lg">
      <Group justify="space-between" mt="md" mb="xs">
        <Text fw={500}>{submission.getDefaultOptions().data.title}</Text>
      </Group>
      <Flex>
        <Box>
          <ScrollArea h={250} pr="md">
            <Timeline>
              {descendingPosts.map((post) => {
                const completedAt = new Date(
                  post.completedAt ?? post.createdAt,
                ).toLocaleString();
                let color: MantineColor = 'grey';
                if (post.state === PostRecordState.DONE) {
                  color = 'green';
                } else if (post.state === PostRecordState.FAILED) {
                  color = 'red';
                }
                let bullet = <IconSend />;
                if (post.state === PostRecordState.DONE) {
                  bullet = <IconCheck color="var(--mantine-color-green-5)" />;
                } else if (post.state === PostRecordState.FAILED) {
                  bullet = <IconX color="var(--mantine-color-red-5)" />;
                }
                return (
                  <Timeline.Item
                    style={{ cursor: 'pointer' }}
                    onClickCapture={() => {
                      setActivePost(post);
                    }}
                    key={post.id}
                    title={
                      <Text fw={post === activePost ? 500 : undefined}>
                        <Trans>Post</Trans>
                      </Text>
                    }
                    c={color}
                    bullet={bullet}
                  >
                    <Text size="xs">
                      {post.children.map((child) => (
                        <Badge title={JSON.stringify(child)} />
                      ))}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {completedAt}
                    </Text>
                  </Timeline.Item>
                );
              })}
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
          Post Log TODO
        </Box>
      </Flex>
    </Card>
  );
}

export function SubmissionHistoryView(props: SubmissionViewProps) {
  const { _ } = useLingui();
  const { type } = props;
  const { state: submissions } = useStore(SubmissionStore);
  const [nameFilter, setNameFilter] = useState<string>('');

  let filteredSubmissions = submissions.filter(
    (submission) => submission.type === type && submission.posts.length > 0,
  );

  if (nameFilter.trim().length > 0) {
    filteredSubmissions = filteredSubmissions.filter((submission) => {
      const defaultOption = submission.getDefaultOptions();
      return defaultOption.data.title
        ?.toLowerCase()
        .includes(nameFilter.toLowerCase());
    });
  }

  const buckets = bucketizeSubmissionsByPostDate(filteredSubmissions);

  const history: JSX.Element[] = [];
  buckets.forEach(([date, postedSubmission]) => {
    const time = new Date(Number(date));
    const cards: JSX.Element[] = [];
    Object.entries(postedSubmission).forEach(([id, record]) => {
      const { submission } = record;
      cards.push(<SubmissionHistoryCard key={id} submission={submission} />);
    });

    history.push(
      <Stack key={time.toISOString()}>
        <Title order={4}>{time.toLocaleDateString()}</Title>
        {cards}
      </Stack>,
    );
  });

  return (
    <Stack>
      <Box>
        <Paper shadow="xs" p="xs">
          <Flex align="center">
            <Input
              flex="6"
              placeholder={_(msg`Search`)}
              width="100%"
              leftSection={<IconSearch />}
              value={nameFilter}
              onChange={(event) => setNameFilter(event.currentTarget.value)}
            />
          </Flex>
        </Paper>
      </Box>
      <Box>
        {history.length === 0 ? (
          <div>
            <Trans>No history available</Trans>
          </div>
        ) : (
          history.map((item) => item)
        )}
      </Box>
    </Stack>
  );
}
