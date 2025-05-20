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
  createStyles,
} from '@mantine/core';
import { useMemo } from 'react';
import { defaultTargetProvider } from '../../../utils/target-provider';
import { format } from 'date-fns';
import { PostRecordState } from '@postybirb/types';

const useStyles = createStyles((theme) => ({
  item: {
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.sm,
    padding: theme.spacing.sm,
    backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.white,
    border: `1px solid ${
      theme.colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[3]
    }`,
  },
  success: {
    borderLeft: `4px solid ${theme.colors.green[6]}`,
  },
  failed: {
    borderLeft: `4px solid ${theme.colors.red[6]}`,
  },
}));

interface RecentPostsProps {
  posts: any[];
  submissions: any[];
}

export function RecentPosts({ posts, submissions }: RecentPostsProps) {
  const { classes, cx } = useStyles();

  const recentPosts = useMemo(() => {
    return posts
      .filter(post => post.state === PostRecordState.DONE || post.state === PostRecordState.FAILED)
      .map(post => {
        const submission = submissions.find(s => s.id === post.submissionId);
        const title = submission?.getDefaultOptions()?.data?.title || 'Untitled';
        
        // Get thumbnail URL if there are files
        let thumbnailUrl;
        if (submission?.files && submission.files.length > 0) {
          thumbnailUrl = `${defaultTargetProvider()}/api/file/thumbnail/${submission.files[0].id}`;
        }
        
        const completedAt = post.completedAt 
          ? format(new Date(post.completedAt), "PPp")
          : null;
          
        const isSuccess = post.state === PostRecordState.DONE;
        
        return {
          id: post.id,
          submissionId: post.submissionId,
          title,
          isSuccess,
          completedAt,
          thumbnailUrl
        };
      })
      .sort((a, b) => {
        if (!a.completedAt) return 1;
        if (!b.completedAt) return -1;
        return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime();
      });
  }, [posts, submissions]);

  if (recentPosts.length === 0) {
    return (
      <Paper withBorder p="md" radius="md" shadow="sm">
        <Text align="center" color="dimmed">
          <Trans>No recent posts</Trans>
        </Text>
      </Paper>
    );
  }

  return (
    <Paper withBorder p="md" radius="md" shadow="sm">
      <Stack spacing="xs">
        <Title order={4}>
          <Group position="apart">
            <span><Trans>Recent Posts</Trans></span>
            <Badge size="sm">{recentPosts.length}</Badge>
          </Group>
        </Title>
        <ScrollArea style={{ height: 300 }}>
          <Stack spacing={0}>
            {recentPosts.map(post => (
              <Box 
                key={post.id} 
                className={cx(
                  classes.item, 
                  post.isSuccess ? classes.success : classes.failed
                )}
              >
                <Group position="apart">
                  <Group>
                    {post.thumbnailUrl && (
                      <img
                        src={post.thumbnailUrl}
                        alt={post.title}
                        style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: '4px' }}
                      />
                    )}
                    <Box>
                      <Text weight={500}>{post.title}</Text>
                      <Group spacing="xs">
                        <Badge color={post.isSuccess ? 'green' : 'red'}>
                          {post.isSuccess ? <Trans>Success</Trans> : <Trans>Failed</Trans>}
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