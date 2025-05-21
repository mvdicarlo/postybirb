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
} from '@mantine/core';
import { PostRecordDto, PostRecordState } from '@postybirb/types';
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
      <Paper withBorder p="md" radius="md" shadow="sm">
        <Text ta="center" c="dimmed">
          <Trans>No recent posts</Trans>
        </Text>
      </Paper>
    );
  }

  return (
    <Paper withBorder p="md" radius="md" shadow="sm">
      <Stack gap="xs">
        <Title order={4}>
          <Group align="apart">
            <span>
              <Trans>Recent Posts</Trans>
            </span>
            <Badge size="sm">{recentPosts.length}</Badge>
          </Group>
        </Title>
        <ScrollArea style={{ height: 300 }}>
          <Stack gap={0}>
            {recentPosts.map((post) => (
              <Box
                key={post.id}
                className={`recent-post-item ${
                  post.isSuccess ? 'recent-post-success' : 'recent-post-failed'
                }`}
              >
                <Group align="apart">
                  <Group>
                    {post.thumbnailUrl && (
                      <img
                        src={post.thumbnailUrl}
                        alt={post.title}
                        style={{
                          width: 50,
                          height: 50,
                          objectFit: 'cover',
                          borderRadius: '4px',
                        }}
                      />
                    )}
                    <Box>
                      <Text fw={500}>{post.title}</Text>
                      <Group gap="xs">
                        <Badge color={post.isSuccess ? 'green' : 'red'}>
                          {post.isSuccess ? (
                            <Trans>Success</Trans>
                          ) : (
                            <Trans>Failed</Trans>
                          )}
                        </Badge>
                        {post.completedAt && (
                          <Text size="sm" color="dimmed">
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
