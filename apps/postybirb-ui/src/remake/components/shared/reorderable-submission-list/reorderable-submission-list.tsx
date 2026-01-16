/**
 * ReorderableSubmissionList - Shared component for reordering submissions.
 * Supports drag-and-drop and keyboard navigation (Tab to focus, Arrow keys to reorder).
 */

import { Trans } from '@lingui/react/macro';
import { Box, Paper, ScrollArea, Stack, Text } from '@mantine/core';
import { PostRecordState } from '@postybirb/types';
import { IconGripVertical } from '@tabler/icons-react';
import { useCallback, useEffect, useRef } from 'react';
import Sortable from 'sortablejs';
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
  const containerRef = useRef<HTMLDivElement>(null);
  const focusedIndexRef = useRef<number>(-1);

  // Initialize Sortable.js for drag-and-drop
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;

    const sortable = new Sortable(el, {
      draggable: '.postybirb__reorderable-item',
      handle: '.postybirb__reorderable-handle',
      direction: 'vertical',
      animation: 150,
      ghostClass: 'postybirb__reorderable-ghost',
      onEnd: (event) => {
        const { oldIndex, newIndex } = event;
        if (
          oldIndex !== undefined &&
          newIndex !== undefined &&
          oldIndex !== newIndex
        ) {
          const newOrder = [...submissions];
          const [moved] = newOrder.splice(oldIndex, 1);
          newOrder.splice(newIndex, 0, moved);
          onReorder(newOrder);
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
  }, [submissions, onReorder]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent, index: number) => {
      if (event.key === 'ArrowUp' && index > 0) {
        event.preventDefault();
        const newOrder = [...submissions];
        const [moved] = newOrder.splice(index, 1);
        newOrder.splice(index - 1, 0, moved);
        onReorder(newOrder);
        focusedIndexRef.current = index - 1;
      } else if (event.key === 'ArrowDown' && index < submissions.length - 1) {
        event.preventDefault();
        const newOrder = [...submissions];
        const [moved] = newOrder.splice(index, 1);
        newOrder.splice(index + 1, 0, moved);
        onReorder(newOrder);
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
          <Stack gap="xs" ref={containerRef}>
            {submissions.map((submission, index) => {
              const title = submission.getDefaultOptions()?.data?.title;
              const lastPost = submission.latestPost;
              const hasFailedPost =
                lastPost && lastPost.state === PostRecordState.FAILED;

              return (
                <Paper
                  key={submission.id}
                  withBorder
                  p="xs"
                  radius="sm"
                  tabIndex={0}
                  className={cn(['postybirb__reorderable-item'], {
                    'postybirb__reorderable-item--failed': hasFailedPost,
                  })}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                >
                  <Box className="postybirb__reorderable-item-content">
                    <Box className="postybirb__reorderable-handle">
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
            })}
          </Stack>
        </ScrollArea>
      </Box>
    </Box>
  );
}
