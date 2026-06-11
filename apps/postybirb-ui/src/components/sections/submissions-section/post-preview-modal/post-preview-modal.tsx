/**
 * PostPreviewModal - Dry-run preview of how a submission would post.
 *
 * Calls the Relay preview endpoint (no network posting, nothing persisted) and
 * renders, per account, whether the website is supported and exactly how each
 * file would be converted/resized (before -> after dimensions, bytes, mime).
 */

import { Trans } from '@lingui/react/macro';
import {
    Alert,
    Badge,
    Group,
    Loader,
    Modal,
    Stack,
    Table,
    Text,
    ThemeIcon,
} from '@mantine/core';
import { PreviewResult, SubmissionType } from '@postybirb/types';
import { IconAlertTriangle, IconArrowRight, IconCheck } from '@tabler/icons-react';
import { filesize } from 'filesize';
import { useEffect, useState } from 'react';
import postApi from '../../../../api/post.api';
import { useAccountsMap } from '../../../../stores/entity/account-store';

export interface PostPreviewModalProps {
  /** Whether the modal is open. */
  opened: boolean;
  /** Handler to close the modal. */
  onClose: () => void;
  /** The submission to preview. */
  submissionId: string;
}

function dimsLabel(d?: {
  width: number;
  height: number;
  bytes: number;
  mimeType: string;
}): string {
  if (!d) return '—';
  const px = d.width && d.height ? `${d.width}×${d.height} · ` : '';
  return `${px}${filesize(d.bytes)} · ${d.mimeType}`;
}

export function PostPreviewModal({
  opened,
  onClose,
  submissionId,
}: PostPreviewModalProps) {
  const accountsMap = useAccountsMap();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PreviewResult | null>(null);

  useEffect(() => {
    if (!opened) return undefined;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setResult(null);
    postApi
      .preview(submissionId)
      .then((res) => {
        if (!cancelled) setResult(res.body);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [opened, submissionId]);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={<Trans>Post preview (dry run)</Trans>}
      size="xl"
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          <Trans>
            Shows how each file would be converted and resized for every
            selected account. Nothing is posted.
          </Trans>
        </Text>

        {loading && (
          <Group justify="center" py="lg">
            <Loader size="sm" />
            <Text size="sm">
              <Trans>Processing files…</Trans>
            </Text>
          </Group>
        )}

        {error && (
          <Alert color="red" icon={<IconAlertTriangle size={16} />}>
            {error}
          </Alert>
        )}

        {result && !loading && result.tasks.length === 0 && (
          <Alert color="yellow" icon={<IconAlertTriangle size={16} />}>
            <Trans>No accounts are selected for this submission.</Trans>
          </Alert>
        )}

        {result &&
          !loading &&
          result.tasks.map((task) => {
            const account = accountsMap.get(task.accountId);
            const accountLabel = account
              ? `${account.websiteDisplayName} · ${account.name}`
              : task.websiteId;
            return (
              <Stack key={`${task.websiteId}:${task.accountId}`} gap="xs">
                <Group gap="xs">
                  <Text fw={600} size="sm">
                    {accountLabel}
                  </Text>
                  {task.supported ? (
                    <Badge color="green" variant="light" size="sm">
                      <Trans>Supported</Trans>
                    </Badge>
                  ) : (
                    <Badge color="red" variant="light" size="sm">
                      <Trans>Not supported</Trans>
                    </Badge>
                  )}
                </Group>

                {task.supported && result.type === SubmissionType.FILE && (
                  <Table withTableBorder striped highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>
                          <Trans>File</Trans>
                        </Table.Th>
                        <Table.Th>
                          <Trans>Original</Trans>
                        </Table.Th>
                        <Table.Th>
                          <Trans>Result</Trans>
                        </Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {task.files.map((file) => (
                        <Table.Tr key={file.fileId}>
                          <Table.Td>
                            <Text size="sm">{file.fileName}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="xs" c="dimmed">
                              {dimsLabel(file.from)}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            {/* eslint-disable-next-line no-nested-ternary */}
                            {file.excluded ? (
                              <Badge color="gray" variant="light" size="sm">
                                <Trans>Excluded</Trans>
                              </Badge>
                            ) : file.error ? (
                              <Group gap={4} wrap="nowrap">
                                <ThemeIcon color="red" variant="light" size="sm">
                                  <IconAlertTriangle size={12} />
                                </ThemeIcon>
                                <Text size="xs" c="red">
                                  {file.error}
                                </Text>
                              </Group>
                            ) : (
                              <Group gap={6} wrap="nowrap">
                                <IconArrowRight size={12} />
                                <Text size="xs">{dimsLabel(file.to)}</Text>
                                {file.to &&
                                  file.to.bytes === file.from.bytes &&
                                  file.to.mimeType === file.from.mimeType && (
                                    <ThemeIcon
                                      color="green"
                                      variant="light"
                                      size="sm"
                                    >
                                      <IconCheck size={12} />
                                    </ThemeIcon>
                                  )}
                              </Group>
                            )}
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                )}

                {task.supported && result.type === SubmissionType.MESSAGE && (
                  <Text size="xs" c="dimmed">
                    <Trans>
                      Message submission — no file processing required.
                    </Trans>
                  </Text>
                )}
              </Stack>
            );
          })}
      </Stack>
    </Modal>
  );
}
