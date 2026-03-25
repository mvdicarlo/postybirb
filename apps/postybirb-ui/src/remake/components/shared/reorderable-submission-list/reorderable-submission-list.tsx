/**
 * ReorderableSubmissionList - Shared component for reordering submissions.
 * Supports drag-and-drop and keyboard navigation (Tab to focus, Arrow keys to reorder).
 */

import { Trans } from '@lingui/react/macro';
import { Box, Paper, ScrollArea, Stack, Text } from '@mantine/core';
import { PostRecordState } from '@postybirb/types';
import { IconGripVertical } from '@tabler/icons-react';
import { useCallback, useEffect, useRef } from 'react';
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
import type { SubmissionRecord } from '../../../stores/records';
import { cn } from '../../../utils/class-names';
import './reorderable-submission-list.css';

export interface ReorderableSubmissionListProps {
  /** List of submissions to display */
  submissions: SubmissionRecord[];
  /** Callback when submissions are reordered */
  onReorder: (submissions: SubmissionRecord[]) => void;
  /** Optional render function for additional content per item */
  renderExtra?: (
    submission: SubmissionRecord,
    index: number,
  ) => React.ReactNode;
  /** Maximum height of the list */
  maxHeight?: string | number;
}

/**
 * ReorderableSubmissionList component.
 * Renders a list of submissions that can be reordered via drag-and-drop or keyboard.
 */
export function ReorderableSubmissionList({
  submissions,
  onReorder,
  renderExtra,
  maxHeight = '400px',
}: ReorderableSubmissionListProps) {
  const focusedIndexRef = useRef<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = submissions.findIndex((s) => s.id === active.id);
      const newIndex = submissions.findIndex((s) => s.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        onReorder(arrayMove(submissions, oldIndex, newIndex));
      }
    },
    [submissions, onReorder],
  );

  // Handle keyboard navigation (arrow keys to reorder)
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent, index: number) => {
      if (event.key === 'ArrowUp' && index > 0) {
        event.preventDefault();
        onReorder(arrayMove(submissions, index, index - 1));
        focusedIndexRef.current = index - 1;
      } else if (event.key === 'ArrowDown' && index < submissions.length - 1) {
        event.preventDefault();
        onReorder(arrayMove(submissions, index, index + 1));
        focusedIndexRef.current = index + 1;
      }
    },
    [submissions, onReorder],
  );

  // Restore focus after reorder
  useEffect(() => {
    if (focusedIndexRef.current >= 0 && containerRef.current) {
      const items = containerRef.current.querySelectorAll(
        '.postybirb__reorderable-item',
      );
      const targetItem = items[focusedIndexRef.current] as HTMLElement;
      if (targetItem) {
        targetItem.focus();
      }
      focusedIndexRef.current = -1;
    }
  }, [submissions]);

  if (submissions.length === 0) {
    return (
      <Paper
        withBorder
        p="xl"
        radius="md"
        className="postybirb__reorderable-empty"
      >
        <Text size="sm" c="dimmed" ta="center">
          <Trans>No submissions selected</Trans>
        </Text>
      </Paper>
    );
  }

  return (
    <Box className="postybirb__reorderable-container">
      <Text size="xs" c="dimmed" mb="xs">
        <Trans>Drag or use arrow keys to reorder</Trans>
      </Text>
      <Box style={{ overflow: 'hidden', maxHeight }}>
        <ScrollArea h="100%" scrollbars="y">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={submissions.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <Stack gap="xs" ref={containerRef}>
                {submissions.map((submission, index) => (
                  <SortableReorderableItem
                    key={submission.id}
                    submission={submission}
                    index={index}
                    onKeyDown={handleKeyDown}
                    renderExtra={renderExtra}
                  />
                ))}
              </Stack>
            </SortableContext>
          </DndContext>
        </ScrollArea>
      </Box>
    </Box>
  );
}

/** Sortable item wrapper using dnd-kit */
function SortableReorderableItem({
  submission,
  index,
  onKeyDown,
  renderExtra,
}: {
  submission: SubmissionRecord;
  index: number;
  onKeyDown: (event: React.KeyboardEvent, index: number) => void;
  renderExtra?: ReorderableSubmissionListProps['renderExtra'];
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: submission.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const title = submission.getDefaultOptions()?.data?.title;
  const lastPost = submission.latestPost;
  const hasFailedPost =
    lastPost && lastPost.state === PostRecordState.FAILED;

  return (
    <Paper
      ref={setNodeRef}
      style={style}
      withBorder
      p="xs"
      radius="sm"
      tabIndex={0}
      className={cn(['postybirb__reorderable-item'], {
        'postybirb__reorderable-item--failed': hasFailedPost,
      })}
      onKeyDown={(e) => onKeyDown(e, index)}
    >
      <Box className="postybirb__reorderable-item-content">
        <Box
          className="postybirb__reorderable-handle"
          {...attributes}
          {...listeners}
        >
          <IconGripVertical size={16} />
        </Box>
        <Box className="postybirb__reorderable-item-main">
          <Text size="sm" fw={500} truncate>
            {title || <Trans>Untitled</Trans>}
          </Text>
          {renderExtra && renderExtra(submission, index)}
        </Box>
      </Box>
    </Paper>
  );
}
