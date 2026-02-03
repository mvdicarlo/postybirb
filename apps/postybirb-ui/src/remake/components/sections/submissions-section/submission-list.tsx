/**
 * SubmissionList - Renders the virtualized, sortable list of submissions.
 * Uses TanStack Virtual for performance with large lists.
 * Uses dnd-kit for drag-and-drop reordering.
 * Provides scroll container context for thumbnail lazy-loading.
 */

import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Box, Loader, ScrollArea } from '@mantine/core';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useCallback, useEffect, useRef, useState } from 'react';
import submissionApi from '../../../api/submission.api';
import type { SubmissionRecord } from '../../../stores/records';
import { useIsCompactView } from '../../../stores/ui/appearance-store';
import { EmptyState } from '../../empty-state';
import { useSubmissionsContext } from './context';
import { SortableSubmissionCard, SubmissionCard } from './submission-card';
import './submissions-section.css';
import { DRAGGABLE_SUBMISSION_CLASS } from './types';

/** Card height for virtualization in normal mode */
const NORMAL_CARD_HEIGHT = 102;
/** Card height for virtualization in compact mode */
const COMPACT_CARD_HEIGHT = 89;
/** Number of items to render outside visible area */
const OVERSCAN_COUNT = 5;

interface SubmissionListProps {
  /** Whether submissions are loading */
  isLoading: boolean;
  /** Ordered list of submissions to display */
  submissions: SubmissionRecord[];
  /** Callback to update ordered submissions after drag */
  onReorder: (submissions: SubmissionRecord[]) => void;
}

/**
 * Virtualized, sortable list of submission cards.
 * Actions and selection are provided via SubmissionsContext.
 */
export function SubmissionList({
  isLoading,
  submissions,
  onReorder,
}: SubmissionListProps) {
  const { submissionType, selectedIds, isDragEnabled } =
    useSubmissionsContext();
  const isCompact = useIsCompactView();

  // Ref for the Mantine ScrollArea viewport - used for virtualization
  const viewportRef = useRef<HTMLDivElement>(null);

  // Track active drag item for DragOverlay
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeSubmission = activeId
    ? submissions.find((s) => s.id === activeId)
    : null;

  // dnd-kit sensors with keyboard accessibility
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before starting drag
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // TanStack Virtual virtualizer - uses the ScrollArea viewport as scroll element
  const virtualizer = useVirtualizer({
    count: submissions.length,
    getScrollElement: () => viewportRef.current,
    estimateSize: () => (isCompact ? COMPACT_CARD_HEIGHT : NORMAL_CARD_HEIGHT),
    overscan: OVERSCAN_COUNT,
  });

  // Invalidate measurements when compact mode changes (card heights change)
  useEffect(() => {
    virtualizer.measure();
  }, [isCompact, virtualizer]);

  // Handle drag start - set active item for overlay
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  // Handle drag end - reorder submissions
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (over && active.id !== over.id) {
        const oldIndex = submissions.findIndex((s) => s.id === active.id);
        const newIndex = submissions.findIndex((s) => s.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
          const newOrder = arrayMove(submissions, oldIndex, newIndex);
          onReorder(newOrder);

          // Determine position relative to target
          const position = newIndex > oldIndex ? 'after' : 'before';
          const targetId = over.id as string;

          // Persist the new order to the server
          submissionApi.reorder(active.id as string, targetId, position);
        }
      }
    },
    [submissions, onReorder],
  );

  // Handle drag cancel
  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  // Get submission IDs for SortableContext
  const submissionIds = submissions.map((s) => s.id);

  if (isLoading) {
    return (
      <Box className="postybirb__submission__list_loading">
        <Loader size="sm" />
      </Box>
    );
  }

  if (submissions.length === 0) {
    return <EmptyState preset="no-results" />;
  }

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext
        items={submissionIds}
        strategy={verticalListSortingStrategy}
      >
        <ScrollArea
          viewportRef={viewportRef}
          className="postybirb__submission__list_scroll"
          style={{ flex: 1 }}
          type="hover"
          scrollbarSize={8}
        >
          <div
            className="postybirb__submission__list"
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualItems.map((virtualRow) => {
              const submission = submissions[virtualRow.index];
              return (
                <div
                  key={submission.id}
                  data-index={virtualRow.index}
                  ref={virtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <SortableSubmissionCard
                    id={submission.id}
                    virtualIndex={virtualRow.index}
                    submission={submission}
                    submissionType={submissionType}
                    isSelected={selectedIds.includes(submission.id)}
                    draggable={isDragEnabled}
                    isCompact={isCompact}
                    className={DRAGGABLE_SUBMISSION_CLASS}
                  />
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </SortableContext>

      {/* DragOverlay renders the dragged item in a portal - critical for virtualization */}
      <DragOverlay>
        {activeSubmission ? (
          <SubmissionCard
            submission={activeSubmission}
            submissionType={submissionType}
            isSelected={selectedIds.includes(activeSubmission.id)}
            draggable={false}
            isCompact={isCompact}
            className={DRAGGABLE_SUBMISSION_CLASS}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
