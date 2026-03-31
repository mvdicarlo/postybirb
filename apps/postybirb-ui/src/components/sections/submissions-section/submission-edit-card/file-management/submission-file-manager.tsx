/**
 * SubmissionFileManager - Container for file cards with drag-and-drop reordering.
 * Uses dnd-kit for React-native drag-and-drop (consolidated from sortablejs).
 */

import {
  closestCenter,
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Trans } from '@lingui/react/macro';
import {
  Box,
  Button,
  Collapse,
  Divider,
  Group,
  Paper,
  ScrollArea,
  Stack,
  Text,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { ISubmissionFileDto } from '@postybirb/types';
import { IconArrowsSort, IconListDetails } from '@tabler/icons-react';
import {
  CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import fileSubmissionApi from '../../../../../api/file-submission.api';
import { useSubmissionEditCardContext } from '../context';
import { BulkFileEditor } from './bulk-file-editor';
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

/** Wrapper that makes a SubmissionFileCard sortable via dnd-kit */
function SortableFileCard({
  file,
  isDraggable,
  totalFiles,
}: {
  file: ISubmissionFileDto;
  isDraggable: boolean;
  totalFiles: number;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: file.id,
    disabled: !isDraggable,
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <SubmissionFileCard
        file={file}
        draggable={isDraggable}
        totalFiles={totalFiles}
      />
    </div>
  );
}

export function SubmissionFileManager() {
  const { submission } = useSubmissionEditCardContext();
  const [orderedFiles, setOrderedFiles] = useState(() =>
    orderFiles(submission.files),
  );
  const [bulkOpen, { toggle: toggleBulk }] = useDisclosure(false);

  // Track file IDs to ensure reactivity when files are added/removed
  const fileIds = submission.files.map((f) => f.id).join(',');

  useEffect(() => {
    setOrderedFiles(orderFiles(submission.files));
  }, [submission.files, fileIds]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const fileIdList = useMemo(
    () => orderedFiles.map((f) => f.id),
    [orderedFiles],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = orderedFiles.findIndex((f) => f.id === active.id);
      const newIndex = orderedFiles.findIndex((f) => f.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const newOrderedFiles = arrayMove(orderedFiles, oldIndex, newIndex);

      // Update order property for all files
      const baseOrder = Date.now();
      newOrderedFiles.forEach((file, index) => {
        // eslint-disable-next-line no-param-reassign
        file.order = baseOrder + index;
      });

      setOrderedFiles(newOrderedFiles);

      // Persist to backend
      fileSubmissionApi.reorder({
        order: newOrderedFiles.reduce((acc: Record<string, number>, file) => {
          acc[file.id] = file.order ?? 0;
          return acc;
        }, {}),
      });
    },
    [orderedFiles],
  );

  const isDraggable = orderedFiles.length > 1;

  return (
    <Paper withBorder p={0} radius="md">
      <Box p="xs">
        <Group justify="space-between">
          <Text size="sm" fw={600}>
            <Trans>Files</Trans> ({orderedFiles.length})
          </Text>
          <Group gap="xs">
            {orderedFiles.length > 1 && (
              <Button
                size="xs"
                variant={bulkOpen ? 'filled' : 'subtle'}
                color="violet"
                onClick={toggleBulk}
                leftSection={<IconListDetails size={12} />}
              >
                <Trans>Bulk edit files</Trans>
              </Button>
            )}
            {isDraggable && (
              <>
                <IconArrowsSort size={14} />
                <Text size="xs" c="dimmed">
                  <Trans>Drag to reorder</Trans>
                </Text>
              </>
            )}
          </Group>
        </Group>
      </Box>

      {/* Bulk edit panel */}
      <Collapse in={bulkOpen && orderedFiles.length > 1}>
        <Divider />
        <BulkFileEditor files={orderedFiles} />
        <Divider />
      </Collapse>

      <ScrollArea
        h={orderedFiles.length === 1 ? 'auto' : 350}
        p="md"
        offsetScrollbars
        scrollbarSize={6}
        type="auto"
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={fileIdList}
            strategy={verticalListSortingStrategy}
          >
            <Stack gap="md">
              {orderedFiles.map((file) => (
                <SortableFileCard
                  key={`${file.id}:${file.hash}`}
                  file={file}
                  isDraggable={isDraggable}
                  totalFiles={orderedFiles.length}
                />
              ))}
            </Stack>
          </SortableContext>
        </DndContext>
      </ScrollArea>

      <Box p="md" pt={0}>
        <FileUploader />
      </Box>
    </Paper>
  );
}
