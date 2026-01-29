/**
 * FileList - Virtualized scrollable file list with previews.
 * Uses TanStack Virtual for performance with large file sets.
 */

import { Trans } from '@lingui/react/macro';
import { Box, Card, Stack, Text, ThemeIcon } from '@mantine/core';
import { FileWithPath } from '@mantine/dropzone';
import { IconFileUpload } from '@tabler/icons-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';
import { FilePreview } from './file-preview';
import './file-submission-modal.css';
import { FileItem } from './file-submission-modal.utils';

/** Estimated height of each file preview card */
const ESTIMATED_ITEM_HEIGHT = 72;
/** Number of items to render outside visible area */
const OVERSCAN_COUNT = 3;

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
 * Virtualized file list with file previews.
 */
export function FileList({
  fileItems,
  onDelete,
  onTitleChange,
  onEdit,
}: FileListProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: fileItems.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => ESTIMATED_ITEM_HEIGHT,
    overscan: OVERSCAN_COUNT,
  });

  const virtualItems = virtualizer.getVirtualItems();

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
        <div
          ref={scrollContainerRef}
          className="postybirb__file_submission_modal_file_list"
          style={{
            flex: 1,
            overflow: 'auto',
            minHeight: 0,
          }}
        >
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualItems.map((virtualRow) => {
              const item = fileItems[virtualRow.index];
              return (
                <div
                  key={item.file.name}
                  data-index={virtualRow.index}
                  ref={virtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`,
                    paddingBottom: '8px',
                  }}
                >
                  <FilePreview
                    item={item}
                    onDelete={onDelete}
                    onTitleChange={onTitleChange}
                    onEdit={onEdit}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Box>
  );
}
