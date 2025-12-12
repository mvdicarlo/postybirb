/**
 * SubmissionFileCard - Individual file card with preview, metadata, and actions.
 */

import { Trans } from '@lingui/react/macro';
import {
    ActionIcon,
    Badge,
    Box,
    Collapse,
    Divider,
    Flex,
    Group,
    Paper,
    Text,
    Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
    FileType,
    IAccountDto,
    ISubmissionFileDto,
    NULL_ACCOUNT_ID,
} from '@postybirb/types';
import { getFileType } from '@postybirb/utils/file-type';
import {
    IconChevronDown,
    IconChevronRight,
    IconGripVertical,
    IconTrash,
} from '@tabler/icons-react';
import { useMemo } from 'react';
import fileSubmissionApi from '../../../../../api/file-submission.api';
import { useAccountsMap } from '../../../../../stores/account-store';
import { useSubmissionEditCardContext } from '../context';
import { FileActions } from './file-actions';
import { FileMetadata } from './file-metadata';
import { DRAGGABLE_FILE_CLASS } from './submission-file-manager';

interface SubmissionFileCardProps {
  file: ISubmissionFileDto;
  draggable: boolean;
  totalFiles: number;
}

export function SubmissionFileCard({
  file,
  draggable,
  totalFiles,
}: SubmissionFileCardProps) {
  const { submission } = useSubmissionEditCardContext();
  const accountsMap = useAccountsMap();
  const [expanded, { toggle }] = useDisclosure(false);
  const fileType = getFileType(file.fileName);

  const canDelete = totalFiles > 1;

  const handleDelete = async () => {
    if (!canDelete) return;

    try {
      await fileSubmissionApi.removeFile(submission.id, file.id, 'file');
    } catch (error) {
      notifications.show({
        message:
          // eslint-disable-next-line lingui/no-unlocalized-strings
          error instanceof Error ? error.message : 'Failed to delete file',
        color: 'red',
      });
    }
  };

  // Get accounts for metadata (exclude default) - use store for full IAccountDto with websiteInfo
  const accounts: IAccountDto[] = useMemo(() => {
    const accountIds = submission.options
      .map((option) => option.account?.id)
      .filter((id): id is string => !!id && id !== NULL_ACCOUNT_ID);

    return accountIds
      .map((id) => {
        const record = accountsMap.get(id);
        if (!record) return null;
        // Map AccountRecord to IAccountDto
        return {
          id: record.id,
          name: record.name,
          website: record.website,
          groups: record.groups,
          state: record.state,
          data: record.data,
          websiteInfo: record.websiteInfo,
          createdAt: record.createdAt.toISOString(),
          updatedAt: record.updatedAt.toISOString(),
        } as IAccountDto;
      })
      .filter((acc): acc is IAccountDto => acc !== null);
  }, [submission.options, accountsMap]);

  return (
    <Paper
      p="sm"
      shadow="xs"
      radius="md"
      withBorder
      className={DRAGGABLE_FILE_CLASS}
      style={{
        cursor: draggable ? 'grab' : undefined,
        position: 'relative',
      }}
    >
      {/* Drag handle */}
      {draggable && (
        <Box
          style={{
            position: 'absolute',
            left: 8,
            top: '50%',
            transform: 'translateY(-50%)',
            opacity: 0.5,
            cursor: 'grab',
          }}
        >
          <IconGripVertical size={16} />
        </Box>
      )}

      <Flex gap="md" align="flex-start" ml={draggable ? 'md' : 0}>
        {/* File Preview with Actions */}
        <Box
          style={{
            // eslint-disable-next-line lingui/no-unlocalized-strings
            flex: '0 0 auto',
            padding: 4,
            borderRadius: 8,
            background: 'var(--mantine-color-dark-6)',
          }}
        >
          <FileActions file={file} submissionId={submission.id} />
        </Box>

        {/* File Info */}
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Group justify="space-between" wrap="nowrap" mb={4}>
            <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
              <Text size="sm" fw={600} truncate style={{ maxWidth: 200 }}>
                {file.fileName}
              </Text>
              <Badge
                size="xs"
                variant="light"
                color={getFileTypeColor(fileType)}
              >
                {fileType}
              </Badge>
            </Group>

            <Group gap="xs">
              {/* Expand/Collapse toggle */}
              <Tooltip
                label={
                  expanded ? (
                    <Trans>Collapse</Trans>
                  ) : (
                    <Trans>Edit metadata</Trans>
                  )
                }
              >
                <ActionIcon size="sm" variant="subtle" onClick={toggle}>
                  {expanded ? (
                    <IconChevronDown size={14} />
                  ) : (
                    <IconChevronRight size={14} />
                  )}
                </ActionIcon>
              </Tooltip>

              {/* Delete button */}
              <Tooltip
                label={
                  canDelete ? (
                    <Trans>Delete file</Trans>
                  ) : (
                    <Trans>Cannot delete the only file</Trans>
                  )
                }
              >
                <ActionIcon
                  size="sm"
                  variant="subtle"
                  color="red"
                  disabled={!canDelete}
                  onClick={handleDelete}
                >
                  <IconTrash size={14} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Group>

          {/* File size */}
          <Text size="xs" c="dimmed">
            {formatFileSize(file.size)} • {file.width}×{file.height}
          </Text>
        </Box>
      </Flex>

      {/* Expandable metadata section */}
      <Collapse in={expanded} ml="lg">
        <Divider my="sm" variant="dashed" />
        <FileMetadata file={file} accounts={accounts} />
      </Collapse>
    </Paper>
  );
}

function getFileTypeColor(fileType: FileType): string {
  switch (fileType) {
    case FileType.IMAGE:
      return 'blue';
    case FileType.TEXT:
      return 'green';
    case FileType.VIDEO:
      return 'purple';
    case FileType.AUDIO:
      return 'orange';
    default:
      return 'gray';
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
