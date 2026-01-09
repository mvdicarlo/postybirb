/**
 * SubmissionFileManager - Container for file cards with drag-and-drop reordering.
 */

import { Trans } from '@lingui/react/macro';
import { Box, Group, Paper, ScrollArea, Stack, Text } from '@mantine/core';
import { ISubmissionFileDto } from '@postybirb/types';
import { IconArrowsSort } from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';
import Sortable from 'sortablejs';
import fileSubmissionApi from '../../../../../../api/file-submission.api';
import { draggableIndexesAreDefined } from '../../../../../../helpers/sortable.helper';
import { useSubmissionEditCardContext } from '../context';
import './file-management.css';
import { FileUploader } from './file-uploader';
import { SubmissionFileCard } from './submission-file-card';

export const DRAGGABLE_FILE_CLASS = 'postybirb-sortable-file';

function orderFiles(files: ISubmissionFileDto[]): ISubmissionFileDto[] {
  return [...files]
    .filter((f) => !!f)
    .sort((a, b) => {
      const aOrder = a.order ?? Number.MAX_SAFE_INTEGER;
      const bOrder = b.order ?? Number.MAX_SAFE_INTEGER;
      return aOrder - bOrder;
    });
}

export function SubmissionFileManager() {
  const { submission } = useSubmissionEditCardContext();
  const ref = useRef<HTMLDivElement>(null);
  const [orderedFiles, setOrderedFiles] = useState(() =>
    orderFiles(submission.files),
  );

  // Track file IDs to ensure reactivity when files are added/removed
  const fileIds = submission.files.map((f) => f.id).join(',');

  useEffect(() => {
    setOrderedFiles(orderFiles(submission.files));
  }, [submission.files, fileIds]);

  // Setup SortableJS for drag-and-drop reordering
  useEffect(() => {
    const el = ref.current;
    if (!el || orderedFiles.length <= 1) {
      return () => {};
    }

    const sortable = new Sortable(el, {
      disabled: orderedFiles.length <= 1,
      draggable: `.${DRAGGABLE_FILE_CLASS}`,
      direction: 'vertical',
      onEnd: (event) => {
        if (
          draggableIndexesAreDefined(event) &&
          event.oldDraggableIndex !== event.newDraggableIndex
        ) {
          const newOrderedFiles = [...orderedFiles];
          const [movedFile] = newOrderedFiles.splice(
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            event.oldDraggableIndex!,
            1,
          );
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          newOrderedFiles.splice(event.newDraggableIndex!, 0, movedFile);

          // Update order property for all files
          const baseOrder = Date.now();
          newOrderedFiles.forEach((file, index) => {
            // eslint-disable-next-line no-param-reassign
            file.order = baseOrder + index;
          });

          setOrderedFiles(newOrderedFiles);

          // Persist to backend
          fileSubmissionApi.reorder({
            order: newOrderedFiles.reduce(
              (acc: Record<string, number>, file) => {
                acc[file.id] = file.order ?? 0;
                return acc;
              },
              {},
            ),
          });
        }
      },
    });

    return () => {
      try {
        sortable.destroy();
      } catch {
        // Ignore destroy errors
      }
    };
  }, [orderedFiles]);

  const isDraggable = orderedFiles.length > 1;

  return (
    <Paper withBorder p={0} radius="md">
      <Box p="xs">
        <Group justify="space-between">
          <Text size="sm" fw={600}>
            <Trans>Files</Trans> ({orderedFiles.length})
          </Text>
          {isDraggable && (
            <Group gap="xs">
              <IconArrowsSort size={14} />
              <Text size="xs" c="dimmed">
                <Trans>Drag to reorder</Trans>
              </Text>
            </Group>
          )}
        </Group>
      </Box>

      <ScrollArea
        h={orderedFiles.length === 1 ? 'auto' : 350}
        p="md"
        offsetScrollbars
        scrollbarSize={6}
        type="auto"
      >
        <Stack ref={ref} gap="md">
          {orderedFiles.map((file) => (
            <SubmissionFileCard
              key={`${file.id}:${file.hash}`}
              file={file}
              draggable={isDraggable}
              totalFiles={orderedFiles.length}
            />
          ))}
        </Stack>
      </ScrollArea>

      <Box p="md" pt={0}>
        <FileUploader />
      </Box>
    </Paper>
  );
}
