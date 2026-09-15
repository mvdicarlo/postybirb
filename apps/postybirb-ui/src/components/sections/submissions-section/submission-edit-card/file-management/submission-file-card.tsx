/**
 * SubmissionFileCard - Individual file card with preview, metadata, and actions.
 */

import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import {
    ActionIcon,
    Badge,
    Box,
    Group,
    Paper,
    Text,
    Tooltip,
} from '@mantine/core';
import { FileType, ISubmissionFileDto } from '@postybirb/types';
import { getFileType } from '@postybirb/utils/file-type';
import { IconGripVertical, IconTrash } from '@tabler/icons-react';
import { memo } from 'react';
import fileSubmissionApi from '../../../../../api/file-submission.api';
import { showErrorWithContext } from '../../../../../utils/notifications';
import { useSubmissionEditCardContext } from '../context';
import { FileActions } from './file-actions';
import { FileMetadata } from './file-metadata';
import { DRAGGABLE_FILE_CLASS } from './submission-file-manager';
import { useSubmissionAccounts } from './use-submission-accounts';

interface SubmissionFileCardProps {
  file: ISubmissionFileDto;
  draggable: boolean;
  totalFiles: number;
  dragListeners?: Record<string, unknown>;
}

export const SubmissionFileCard = memo(
  ({ file, draggable, totalFiles, dragListeners }: SubmissionFileCardProps) => {
    const { submission } = useSubmissionEditCardContext();
    const accounts = useSubmissionAccounts();
    const fileType = getFileType(file.fileName);

    const canDelete = totalFiles > 1 && !submission.isArchived;

    const handleDelete = async () => {
      if (!canDelete) return;

      try {
        await fileSubmissionApi.removeFile(submission.id, file.id, 'file');
      } catch (error) {
        showErrorWithContext(error, <Trans>Failed to delete file</Trans>);
      }
    };

    return (
      <Paper
        p="md"
        radius="sm"
        withBorder
        className={`${DRAGGABLE_FILE_CLASS} postybirb-file-card`}
      >
        <Group gap="xs" wrap="nowrap" align="flex-start" mb="md">
          {draggable && (
            <Tooltip label={<Trans>Drag to reorder</Trans>}>
              <ActionIcon
                {...dragListeners}
                variant="subtle"
                color="gray"
                aria-label={t`Drag to reorder`}
                className="postybirb-file-drag-handle"
              >
                <IconGripVertical size={18} />
              </ActionIcon>
            </Tooltip>
          )}
          <Box style={{ flex: 1, minWidth: 0 }}>
            <Text size="sm" fw={600} className="postybirb-file-name">
              {file.fileName}
            </Text>
            <Group gap="xs" mt={4}>
              <Badge
                size="xs"
                variant="light"
                color={getFileTypeColor(fileType)}
              >
                {fileType}
              </Badge>
              <Text size="xs" c="dimmed">
                {formatFileSize(file.size)}
                {file.width > 0 && file.height > 0 && (
                  <>
                    {' '}
                    • {file.width}×{file.height}
                  </>
                )}
              </Text>
            </Group>
          </Box>
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
              variant="subtle"
              color="red"
              disabled={!canDelete}
              onClick={handleDelete}
              aria-label={t`Delete file`}
            >
              <IconTrash size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>

        <div className="postybirb-file-editor">
          <div className="postybirb-file-media">
            <FileActions file={file} submissionId={submission.id} />
          </div>
          <fieldset
            className="postybirb-file-fields"
            disabled={submission.isArchived}
            aria-label={file.fileName}
          >
            <FileMetadata file={file} accounts={accounts} />
          </fieldset>
        </div>
      </Paper>
    );
  },
);

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
