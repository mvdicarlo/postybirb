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
import { Box, Loader } from '@mantine/core';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useCallback, useEffect, useRef, useState } from 'react';
import submissionApi from '../../../api/submission.api';
import type { SubmissionRecord } from '../../../stores/records';
import { useIsCompactView } from '../../../stores/ui/appearance-store';
import { EmptyState } from '../../empty-state';
import { ScrollContainerProvider, useSubmissionsContext } from './context';
import { SortableSubmissionCard, SubmissionCard } from './submission-card';
import './submissions-section.css';
import { DRAGGABLE_SUBMISSION_CLASS } from './types';

/** Estimated card height for virtualization (compact ~60px, normal ~102px) */
const ESTIMATED_CARD_HEIGHT = 102;
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
  const { submissionType, selectedIds, isDragEnabled } = useSubmissionsContext();
  const isCompact = useIsCompactView();

  // Ref for the scroll container - used for virtualization and IntersectionObserver
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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
    })
  );

  // TanStack Virtual virtualizer
  const virtualizer = useVirtualizer({
    count: submissions.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => ESTIMATED_CARD_HEIGHT,
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
          // Persist the new order to the server
          submissionApi.reorder(active.id as string, newIndex);
        }
      }
    },
    [submissions, onReorder]
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
    <ScrollContainerProvider scrollContainerRef={scrollContainerRef}>
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
          <div
            ref={scrollContainerRef}
            className="postybirb__submission__list_scroll"
            style={{
              flex: 1,
              overflow: 'auto',
            }}
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
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <SortableSubmissionCard
                      ref={virtualizer.measureElement}
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
          </div>
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
    </ScrollContainerProvider>
  );
}
