import { Trans } from '@lingui/react/macro';
import {
  Accordion,
  Alert,
  Badge,
  Box,
  Button,
  CopyButton,
  Group,
  Paper,
  ScrollArea,
  Stack,
  Text,
  ThemeIcon,
  Title,
  Tooltip
} from '@mantine/core';
import {
  EntityId,
  PostEventDto,
  PostEventType,
  PostRecordState,
  SubmissionType,
} from '@postybirb/types';
import {
  IconAlertCircle,
  IconCheck,
  IconCopy,
  IconExternalLink,
  IconFile,
  IconHistory,
  IconMessage,
  IconX,
} from '@tabler/icons-react';
import moment from 'moment';
import { useMemo } from 'react';
import { SubmissionDto } from '../../../models/dtos/submission.dto';
import { CommonTranslations } from '../../../translations/common-translations';
import { ExternalLink } from '../../external-link/external-link';
import { SubmissionFilePreview } from '../../submissions/submission-file-preview/submission-file-preview';
import './recent-posts.css';

interface RecentPostsProps {
  submissions: SubmissionDto[];
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

export function RecentPosts({ submissions }: RecentPostsProps) {
  const recentPosts = useMemo(
    () =>
      submissions
        .flatMap((submission) =>
          submission.posts
            .filter(
              (post) =>
                post.state === PostRecordState.DONE ||
                post.state === PostRecordState.FAILED,
            )
            .map((post) => ({ post, submission })),
        )
        .map(({ post, submission }) => {
          const title = submission?.getDefaultOptions()?.data?.title || (
            <CommonTranslations.Unknown />
          );

          const completedAt = post.completedAt
            ? // eslint-disable-next-line lingui/no-unlocalized-strings
              moment(post.completedAt).format('lll')
            : null;

          const isSuccess = post.state === PostRecordState.DONE;
          const submissionType = submission?.type || SubmissionType.FILE;

          // Extract website posts from events
          const websitePosts = extractWebsitePostsFromEvents(post.events);

          // Get failed and successful posts
          const failedPosts = websitePosts.filter(
            (wp) => !wp.isSuccess && wp.errors.length > 0,
          );
          const successfulPosts = websitePosts.filter(
            (wp) => wp.isSuccess && wp.sourceUrls.length > 0,
          );

          return {
            id: post.id,
            submissionId: post.submissionId,
            title,
            isSuccess,
            completedAt,
            submission,
            submissionType,
            failedPosts,
            successfulPosts,
            post,
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
    [submissions],
  );

  if (recentPosts.length === 0) {
    return (
      <Paper withBorder p="xl" radius="xl" shadow="md" h="100%">
        <Stack align="center" gap="lg" justify="center" h="100%">
          <ThemeIcon size="xl" radius="xl" variant="light" color="gray">
            <IconHistory size={32} />
          </ThemeIcon>
          <Box ta="center">
            <Title order={4} c="dimmed">
              <CommonTranslations.NoItemsFound />
            </Title>
          </Box>
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper withBorder p="xl" radius="xl" shadow="md" h="100%">
      <Stack gap="md" h="100%">
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
        <ScrollArea style={{ flex: 1 }}>
          <Stack gap="sm">
            {recentPosts.map((post) => {
              const showThumbnail =
                post.submissionType === SubmissionType.FILE &&
                post.submission?.files &&
                post.submission.files.length > 0;

              return (
                <Box
                  key={post.id}
                  className={`recent-post-item ${
                    post.isSuccess
                      ? 'recent-post-success'
                      : 'recent-post-failed'
                  }`}
                >
                  <Group wrap="nowrap" align="flex-start">
                    {/* Thumbnail or Icon */}
                    <Box style={{ flexShrink: 0 }}>
                      {showThumbnail && post.submission ? (
                        <SubmissionFilePreview
                          file={post.submission.files[0]}
                          height={64}
                          width={64}
                        />
                      ) : (
                        <ThemeIcon
                          size={64}
                          radius="md"
                          variant="light"
                          color={
                            post.submissionType === SubmissionType.MESSAGE
                              ? 'cyan'
                              : 'gray'
                          }
                        >
                          {post.submissionType === SubmissionType.MESSAGE ? (
                            <IconMessage size={32} />
                          ) : (
                            <IconFile size={32} />
                          )}
                        </ThemeIcon>
                      )}
                    </Box>

                    {/* Content */}
                    <Box style={{ flex: 1, minWidth: 0 }}>
                      <Group gap="xs" mb={4}>
                        <Text fw={600} size="sm" lineClamp={1}>
                          {post.title}
                        </Text>
                        <Tooltip
                          label={
                            <CommonTranslations.SubmissionType
                              withSubmission
                              type={post.submissionType}
                            />
                          }
                        >
                          <Badge
                            size="xs"
                            variant="dot"
                            color={
                              post.submissionType === SubmissionType.FILE
                                ? 'blue'
                                : 'cyan'
                            }
                          >
                            <CommonTranslations.SubmissionType
                              type={post.submissionType}
                            />
                          </Badge>
                        </Tooltip>
                      </Group>

                      <Group gap="sm" mb={post.failedPosts.length > 0 ? 8 : 0}>
                        <Badge
                          color={post.isSuccess ? 'green' : 'red'}
                          variant="filled"
                          radius="xl"
                          size="sm"
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
                        {!post.isSuccess && post.failedPosts.length > 0 && (
                          <Badge
                            color="red"
                            variant="light"
                            radius="xl"
                            size="sm"
                            leftSection={<IconAlertCircle size={12} />}
                          >
                            {post.failedPosts.length}{' '}
                            {post.failedPosts.length === 1 ? (
                              <Trans>Error</Trans>
                            ) : (
                              <Trans>Errors</Trans>
                            )}
                          </Badge>
                        )}
                      </Group>

                      {/* Success Details - Source URLs */}
                      {post.isSuccess && post.successfulPosts.length > 0 && (
                        <Accordion variant="contained" radius="md">
                          <Accordion.Item value="sources">
                            <Accordion.Control>
                              <Text size="sm" fw={500}>
                                <Trans>Posted To</Trans>
                              </Text>
                            </Accordion.Control>
                            <Accordion.Panel>
                              <Stack gap="xs">
                                {post.successfulPosts.map((successPost) => (
                                  <Box key={successPost.accountId}>
                                    <Text size="xs" fw={500} mb={4}>
                                      {successPost.accountName}{' '}
                                      <Text span c="dimmed">
                                        ({successPost.websiteName})
                                      </Text>
                                    </Text>
                                    {successPost.sourceUrls.length > 0 ? (
                                      <Stack gap={4}>
                                        {successPost.sourceUrls.map((url) => (
                                          <ExternalLink key={url} href={url}>
                                            <Group gap={4}>
                                              <Text size="xs">{url}</Text>
                                              <IconExternalLink size={12} />
                                            </Group>
                                          </ExternalLink>
                                        ))}
                                      </Stack>
                                    ) : (
                                      <Text size="xs" c="dimmed">
                                        <CommonTranslations.NoItemsFound />
                                      </Text>
                                    )}
                                  </Box>
                                ))}
                              </Stack>
                            </Accordion.Panel>
                          </Accordion.Item>
                        </Accordion>
                      )}

                      {/* Error Details */}
                      {!post.isSuccess && post.failedPosts.length > 0 && (
                        <Accordion variant="contained" radius="md">
                          <Accordion.Item value="errors">
                            <Accordion.Control>
                              <Text size="sm" fw={500}>
                                <Trans>Error Details</Trans>
                              </Text>
                            </Accordion.Control>
                            <Accordion.Panel>
                              <Stack gap="md">
                                {post.failedPosts.map((failedPost) => {
                                  const errorJson = JSON.stringify(
                                    failedPost.errors,
                                    null,
                                    2,
                                  );
                                  return (
                                    <Alert
                                      key={failedPost.accountId}
                                      variant="light"
                                      color="red"
                                      title={
                                        <Text size="sm">
                                          {failedPost.accountName}{' '}
                                          <Text span c="dimmed">
                                            ({failedPost.websiteName})
                                          </Text>
                                        </Text>
                                      }
                                      icon={<IconAlertCircle size={16} />}
                                    >
                                      <Stack gap="xs">
                                        {failedPost.errors.map(
                                          (error, errIdx) => (
                                            <Text
                                              // eslint-disable-next-line react/no-array-index-key
                                              key={errIdx}
                                              size="xs"
                                              c="dimmed"
                                            >
                                              {error}
                                            </Text>
                                          ),
                                        )}

                                        {/* Copy JSON */}
                                        <Box mt="xs">
                                          <CopyButton
                                            value={errorJson}
                                            timeout={2000}
                                          >
                                            {({ copied, copy }) => (
                                              <Button
                                                color={copied ? 'teal' : 'gray'}
                                                onClick={copy}
                                                leftSection={
                                                  <IconCopy size={12} />
                                                }
                                                size="xs"
                                                variant="subtle"
                                              >
                                                {copied ? (
                                                  <CommonTranslations.CopiedToClipboard />
                                                ) : (
                                                  <CommonTranslations.CopyToClipboard />
                                                )}
                                              </Button>
                                            )}
                                          </CopyButton>
                                        </Box>
                                      </Stack>
                                    </Alert>
                                  );
                                })}
                              </Stack>
                            </Accordion.Panel>
                          </Accordion.Item>
                        </Accordion>
                      )}
                    </Box>
                  </Group>
                </Box>
              );
            })}
          </Stack>
        </ScrollArea>
      </Stack>
    </Paper>
  );
}
