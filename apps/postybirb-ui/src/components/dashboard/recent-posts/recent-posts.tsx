import { Trans } from '@lingui/macro';
import {
  Badge,
  Box,
  Group,
  Paper,
  ScrollArea,
  Stack,
  Text,
  Title,
  ThemeIcon,
} from '@mantine/core';
import { PostRecordDto, PostRecordState } from '@postybirb/types';
import { IconHistory, IconCheck, IconX } from '@tabler/icons-react';
import { format } from 'date-fns';
import { useMemo } from 'react';
import { SubmissionDto } from '../../../models/dtos/submission.dto';
import { defaultTargetProvider } from '../../../transports/http-client';
import './recent-posts.css';

interface RecentPostsProps {
  posts: PostRecordDto[];
  submissions: SubmissionDto[];
}

export function RecentPosts({ posts, submissions }: RecentPostsProps) {
  const recentPosts = useMemo(
    () =>
      posts
        .filter(
          (post) =>
            post.state === PostRecordState.DONE ||
            post.state === PostRecordState.FAILED,
        )
        .map((post) => {
          const submission = submissions.find(
            (s) => s.id === post.submissionId,
          );
          const title =
            // eslint-disable-next-line lingui/no-unlocalized-strings
            submission?.getDefaultOptions()?.data?.title || 'Untitled';

          // Get thumbnail URL if there are files
          let thumbnailUrl;
          if (submission?.files && submission.files.length > 0) {
            thumbnailUrl = `${defaultTargetProvider()}/api/file/thumbnail/${submission.files[0].id}`;
          }

          const completedAt = post.completedAt
            ? // eslint-disable-next-line lingui/no-unlocalized-strings
              format(new Date(post.completedAt), 'PPp')
            : null;

          const isSuccess = post.state === PostRecordState.DONE;

          return {
            id: post.id,
            submissionId: post.submissionId,
            title,
            isSuccess,
            completedAt,
            thumbnailUrl,
          };
        })
        .sort((a, b) => {
          if (!a.completedAt) return 1;
          if (!b.completedAt) return -1;
          return (
            new Date(b.completedAt).getTime() -
            new Date(a.completedAt).getTime()
          );
        }),
    [posts, submissions],
  );

  if (recentPosts.length === 0) {
    return (
      <Paper withBorder p="xl" radius="xl" shadow="md">
        <Stack align="center" gap="lg">
          <ThemeIcon size="xl" radius="xl" variant="light" color="gray">
            <IconHistory size={32} />
          </ThemeIcon>
          <Box ta="center">
            <Title order={4} c="dimmed">
              <Trans>No Recent Posts</Trans>
            </Title>
            <Text size="sm" c="dimmed" mt={4}>
              <Trans>Your recent submission history will appear here</Trans>
            </Text>
          </Box>
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper withBorder p="xl" radius="xl" shadow="md">
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <Group>
            <ThemeIcon size="lg" radius="xl" variant="light" color="blue">
              <IconHistory size={20} />
            </ThemeIcon>
            <Title order={4}>
              <Trans>Recent Posts</Trans>
            </Title>
          </Group>
          <Badge size="lg" variant="filled" radius="xl" color="blue">
            {recentPosts.length}
          </Badge>
        </Group>
        <ScrollArea style={{ height: 320 }}>
          <Stack gap="sm">
            {recentPosts.map((post) => (
              <Box
                key={post.id}
                className={`recent-post-item ${
                  post.isSuccess ? 'recent-post-success' : 'recent-post-failed'
                }`}
              >
                <Group justify="space-between" align="center">
                  <Group>
                    {post.thumbnailUrl && (
                      <Box className="thumbnail">
                        <img
                          src={post.thumbnailUrl}
                          alt={post.title}
                          style={{
                            width: 56,
                            height: 56,
                            objectFit: 'cover',
                            display: 'block',
                          }}
                        />
                      </Box>
                    )}
                    <Box>
                      <Text fw={600} size="sm" lineClamp={1}>
                        {post.title}
                      </Text>
                      <Group gap="sm" mt={4}>
                        <Badge 
                          color={post.isSuccess ? 'green' : 'red'} 
                          variant="filled" 
                          radius="xl"
                          leftSection={
                            post.isSuccess ? (
                              <IconCheck size={12} />
                            ) : (
                              <IconX size={12} />
                            )
                          }
                        >
                          {post.isSuccess ? (
                            <Trans>Success</Trans>
                          ) : (
                            <Trans>Failed</Trans>
                          )}
                        </Badge>
                        {post.completedAt && (
                          <Text size="xs" c="dimmed">
                            {post.completedAt}
                          </Text>
                        )}
                      </Group>
                    </Box>
                  </Group>
                </Group>
              </Box>
            ))}
          </Stack>
        </ScrollArea>
      </Stack>
    </Paper>
  );
}
