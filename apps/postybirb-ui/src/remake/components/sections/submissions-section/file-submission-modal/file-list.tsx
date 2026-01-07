/**
 * FileList - Paginated file list with previews.
 */

import { Trans } from '@lingui/react/macro';
import {
    Box,
    Card,
    Flex,
    Pagination,
    Stack,
    Text,
    ThemeIcon,
} from '@mantine/core';
import { FileWithPath } from '@mantine/dropzone';
import { IconFileUpload } from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import { FilePreview } from './file-preview';
import './file-submission-modal.css';
import { FileItem } from './file-submission-modal.utils';

const FILES_PER_PAGE = 5;

export interface FileListProps {
  /** List of files with metadata */
  fileItems: FileItem[];
  /** Callback when a file is deleted */
  onDelete: (file: FileWithPath) => void;
  /** Callback when a file title is changed */
  onTitleChange: (file: FileWithPath, title: string) => void;
  /** Optional callback for image editing */
  onEdit?: (file: FileWithPath) => void;
}

/**
 * Paginated file list with file previews.
 */
export function FileList({
  fileItems,
  onDelete,
  onTitleChange,
  onEdit,
}: FileListProps) {
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(fileItems.length / FILES_PER_PAGE);

  const paginatedFiles = useMemo(() => {
    const start = (currentPage - 1) * FILES_PER_PAGE;
    return fileItems.slice(start, start + FILES_PER_PAGE);
  }, [fileItems, currentPage]);

  // Reset to last page if current page becomes invalid
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <Box className="postybirb__file_submission_modal_column">
      <Text size="sm" fw={500} mb="xs">
        <Trans>Files</Trans>
        {fileItems.length > 0 && (
          <Text span c="dimmed" ml="xs">
            ({fileItems.length})
          </Text>
        )}
      </Text>

      {fileItems.length === 0 ? (
        <Card
          withBorder
          p="xl"
          radius="sm"
          className="postybirb__file_submission_modal_empty"
        >
          <Stack align="center" justify="center" h="100%" gap="xs">
            <ThemeIcon size={60} radius="xl" variant="light" color="gray">
              <IconFileUpload size={30} />
            </ThemeIcon>
            <Text c="dimmed" ta="center">
              <Trans>No files added yet</Trans>
            </Text>
            <Text c="dimmed" size="xs" ta="center">
              <Trans>Drop files above or click to browse</Trans>
            </Text>
          </Stack>
        </Card>
      ) : (
        <Stack gap="xs" className="postybirb__file_submission_modal_file_list">
          {paginatedFiles.map((item) => (
            <FilePreview
              key={item.file.name}
              item={item}
              onDelete={onDelete}
              onTitleChange={onTitleChange}
              onEdit={onEdit}
            />
          ))}
          {totalPages > 1 && (
            <Flex justify="center" mt="xs">
              <Pagination
                total={totalPages}
                value={currentPage}
                onChange={setCurrentPage}
                size="sm"
              />
            </Flex>
          )}
        </Stack>
      )}
    </Box>
  );
}
