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
  Textarea,
  ThemeIcon,
  Title,
  Tooltip,
} from '@mantine/core';
import {
  PostRecordDto,
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
import { uniq } from 'lodash';
import moment from 'moment';
import { useMemo } from 'react';
import { SubmissionDto } from '../../../models/dtos/submission.dto';
import { CommonTranslations } from '../../../translations/common-translations';
import { ExternalLink } from '../../external-link/external-link';
import { SubmissionFilePreview } from '../../submissions/submission-file-preview/submission-file-preview';
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
          const title = submission?.getDefaultOptions()?.data?.title || (
            <CommonTranslations.Unknown />
          );

          const completedAt = post.completedAt
            ? // eslint-disable-next-line lingui/no-unlocalized-strings
              moment(post.completedAt).format('lll')
            : null;

          const isSuccess = post.state === PostRecordState.DONE;
          const submissionType = submission?.type || SubmissionType.FILE;

          // Get errors from failed website posts
          const errors =
            post.children
              ?.filter((child) => child.errors && child.errors.length > 0)
              .map((child) => ({
                account: child.account?.name || <CommonTranslations.Unknown />,
                website: child.account?.website,
                errors: child.errors,
              })) || [];

          // Get successful posts with source URLs
          const successfulPosts =
            post.children
              ?.filter(
                (child) => child.errors.length === 0 && child.completedAt,
              )
              .map((child) => {
                const sourceUrls = child.metadata.source
                  ? [child.metadata.source]
                  : uniq(Object.values(child.metadata.sourceMap)).filter(
                      Boolean,
                    );
                return {
                  account: child.account?.name || (
                    <CommonTranslations.Unknown />
                  ),
                  website:
                    child.account?.website ||
                    child.account?.websiteInfo?.websiteDisplayName,
                  sourceUrls,
                };
              }) || [];

          return {
            id: post.id,
            submissionId: post.submissionId,
            title,
            isSuccess,
            completedAt,
            submission,
            submissionType,
            errors,
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
    [posts, submissions],
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

                      <Group gap="sm" mb={post.errors.length > 0 ? 8 : 0}>
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
                        {!post.isSuccess && post.errors.length > 0 && (
                          <Badge
                            color="red"
                            variant="light"
                            radius="xl"
                            size="sm"
                            leftSection={<IconAlertCircle size={12} />}
                          >
                            {post.errors.length}{' '}
                            {post.errors.length === 1 ? (
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
                                {post.successfulPosts.map(
                                  (successPost, idx) => (
                                    <Box
                                      // eslint-disable-next-line react/no-array-index-key
                                      key={idx}
                                    >
                                      <Text size="xs" fw={500} mb={4}>
                                        {successPost.account}{' '}
                                        {successPost.website && (
                                          <Text span c="dimmed">
                                            ({successPost.website})
                                          </Text>
                                        )}
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
                                  ),
                                )}
                              </Stack>
                            </Accordion.Panel>
                          </Accordion.Item>
                        </Accordion>
                      )}

                      {/* Error Details */}
                      {!post.isSuccess && post.errors.length > 0 && (
                        <Accordion variant="contained" radius="md">
                          <Accordion.Item value="errors">
                            <Accordion.Control>
                              <Text size="sm" fw={500}>
                                <Trans>Error Details</Trans>
                              </Text>
                            </Accordion.Control>
                            <Accordion.Panel>
                              <Stack gap="md">
                                {post.errors.map((errorGroup, idx) => {
                                  const errorJson = JSON.stringify(
                                    errorGroup.errors,
                                    null,
                                    2,
                                  );
                                  return (
                                    <Alert
                                      // eslint-disable-next-line react/no-array-index-key
                                      key={idx}
                                      variant="light"
                                      color="red"
                                      title={
                                        <Group justify="space-between">
                                          <Text size="sm">
                                            {errorGroup.account}{' '}
                                            {errorGroup.website && (
                                              <Text span c="dimmed">
                                                ({errorGroup.website})
                                              </Text>
                                            )}
                                          </Text>
                                        </Group>
                                      }
                                      icon={<IconAlertCircle size={16} />}
                                    >
                                      <Stack gap="xs">
                                        {errorGroup.errors.map(
                                          (error, errIdx) => (
                                            <Box
                                              // eslint-disable-next-line react/no-array-index-key
                                              key={errIdx}
                                            >
                                              <Text size="xs" fw={500}>
                                                {error.stage}
                                              </Text>
                                              <Text size="xs" c="dimmed">
                                                {error.message}
                                              </Text>
                                              {error.timestamp && (
                                                <Text
                                                  size="xs"
                                                  c="dimmed"
                                                  mt={2}
                                                >
                                                  {moment(
                                                    error.timestamp,
                                                  ).format(
                                                    // eslint-disable-next-line lingui/no-unlocalized-strings
                                                    'LTS',
                                                  )}
                                                </Text>
                                              )}
                                            </Box>
                                          ),
                                        )}

                                        {/* JSON Details */}
                                        <Box mt="xs">
                                          <Group
                                            justify="space-between"
                                            mb="xs"
                                          >
                                            <Text size="xs" fw={500}>
                                              <Trans>Error</Trans>
                                            </Text>
                                            <CopyButton
                                              value={errorJson}
                                              timeout={2000}
                                            >
                                              {({ copied, copy }) => (
                                                <Button
                                                  color={
                                                    copied ? 'teal' : 'gray'
                                                  }
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
                                          </Group>
                                          <Textarea
                                            readOnly
                                            autosize
                                            minRows={3}
                                            maxRows={8}
                                            value={errorJson}
                                            styles={{
                                              input: {
                                                fontFamily: 'monospace',
                                                fontSize: '0.75rem',
                                              },
                                            }}
                                          />
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
