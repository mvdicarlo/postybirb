import { Trans } from '@lingui/react/macro';
import {
  ActionIcon,
  Badge,
  Box,
  Collapse,
  Divider,
  Group,
  Paper,
  Text,
  Tooltip,
} from '@mantine/core';
import {
  FileType,
  ISubmissionFileDto,
  NULL_ACCOUNT_ID,
} from '@postybirb/types';
import { getFileType } from '@postybirb/utils/file-type';
import {
  IconChevronDown,
  IconChevronUp,
  IconGripVertical,
} from '@tabler/icons-react';
import { filesize } from 'filesize';
import { useState } from 'react';
import { SubmissionDto } from '../../../../../models/dtos/submission.dto';
import { FileCardDeleteAction } from './file-card-delete-action';
import { FileCardFileActions } from './file-card-file-actions';
import { FileMetadataManager } from './file-metadata-manager/file-metadata-manager';
import { FileTextAlt } from './file-text-alt';
import { FileValidations } from './file-validations';

export const DRAGGABLE_SUBMISSION_FILE_CLASS_NAME = 'sortable-file';

function getFileTypeColor(fileType: FileType): string {
  switch (fileType) {
    case FileType.IMAGE:
      return 'blue';
    case FileType.TEXT:
      return 'teal';
    case FileType.VIDEO:
      return 'grape';
    case FileType.AUDIO:
      return 'orange';
    default:
      return 'gray';
  }
}

export function SubmissionFileCard({
  file,
  draggable,
  totalFiles,
  submission,
}: {
  submission: SubmissionDto;
  file: ISubmissionFileDto;
  draggable: boolean;
  totalFiles: number;
}) {
  const { metadata } = file;
  const [expanded, setExpanded] = useState(false);
  const fileType = getFileType(file.fileName);

  // Format dimensions string
  const dimensionsStr =
    file.width && file.height ? `${file.width}×${file.height}` : null;

  return (
    <Paper
      key={file.id}
      p={0}
      shadow="xs"
      radius="md"
      withBorder
      className={DRAGGABLE_SUBMISSION_FILE_CLASS_NAME}
      style={{ overflow: 'hidden' }}
    >
      {/* Header Row */}
      <Group
        gap="sm"
        p="xs"
        bg="dark.6"
        wrap="nowrap"
        style={{ cursor: draggable ? 'grab' : undefined }}
      >
        {/* Drag Handle */}
        {draggable && (
          <Tooltip label={<Trans>Drag to reorder</Trans>} withArrow>
            <Box style={{ cursor: 'grab', opacity: 0.6 }}>
              <IconGripVertical size={16} />
            </Box>
          </Tooltip>
        )}

        {/* File Info */}
        <Group gap="xs" style={{ flex: 1, minWidth: 0 }} wrap="nowrap">
          <Text size="sm" fw={600} truncate style={{ maxWidth: 200 }}>
            {file.fileName}
          </Text>
          <Badge
            size="xs"
            variant="light"
            color={getFileTypeColor(fileType)}
            style={{ textTransform: 'uppercase', flexShrink: 0 }}
          >
            {fileType}
          </Badge>
          <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
            {filesize(file.size, { base: 2 }) as string}
            {dimensionsStr && ` • ${dimensionsStr}`}
          </Text>
        </Group>

        {/* Header Actions */}
        <Group gap={4} wrap="nowrap">
          <Tooltip
            label={expanded ? <Trans>Collapse</Trans> : <Trans>Expand</Trans>}
            withArrow
          >
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <IconChevronUp size={16} />
              ) : (
                <IconChevronDown size={16} />
              )}
            </ActionIcon>
          </Tooltip>
          <FileCardDeleteAction
            submissionId={submission.id}
            file={file}
            totalFiles={totalFiles}
          />
        </Group>
      </Group>

      {/* Main Content - Always Visible */}
      <Box p="sm">
        <Group gap="md" align="flex-start" wrap="nowrap">
          {/* File Previews - Horizontal Layout */}
          <Box
            style={{
              flex: '0 0 auto',
              padding: '6px',
              borderRadius: '8px',
              background: 'var(--mantine-color-dark-7)',
            }}
          >
            <FileCardFileActions file={file} submissionId={submission.id} />
          </Box>

          {/* Validations */}
          <Box style={{ flex: 1, minWidth: 0 }}>
            <FileValidations submission={submission} file={file} />
          </Box>
        </Group>
      </Box>

      {/* Collapsible Metadata Section */}
      <Collapse in={expanded}>
        <Divider />
        <Box p="sm" pl={draggable ? 'xl' : 'sm'} bg="dark.7">
          <FileMetadataManager
            submissionId={submission.id}
            file={file}
            metadata={metadata}
            accounts={submission.options
              .map((option) => option.account)
              .filter((account) => account.id !== NULL_ACCOUNT_ID)}
          />

          {fileType === FileType.TEXT && (
            <Box mt="md">
              <Divider my="sm" variant="dashed" />
              <FileTextAlt file={file} />
            </Box>
          )}
        </Box>
      </Collapse>
    </Paper>
  );
}
