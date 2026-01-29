/**
 * SortableSubmissionCard - Wrapper for SubmissionCard that provides dnd-kit sortable functionality.
 * Handles drag transforms and provides the sortable ref for virtualization compatibility.
 */

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CSSProperties, forwardRef } from 'react';
import { SubmissionCard } from './submission-card';
import type { SubmissionCardProps } from './types';

export interface SortableSubmissionCardProps extends SubmissionCardProps {
  /** Unique ID for dnd-kit (usually submission.id) */
  id: string;
  /** Index in the virtual list - used for measuring */
  virtualIndex?: number;
}

/**
 * Sortable wrapper for SubmissionCard using dnd-kit.
 * When dragging is disabled, renders SubmissionCard directly without sortable overhead.
 */
export const SortableSubmissionCard = forwardRef<
  HTMLDivElement,
  SortableSubmissionCardProps
>(
  (
    { id, virtualIndex, draggable = false, ...cardProps },
    forwardedRef
  ) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({
      id,
      disabled: !draggable,
    });

    const style: CSSProperties = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
      zIndex: isDragging ? 1 : 0,
    };

    // Merge refs - we need both the sortable ref and the virtualizer's measurement ref
    const setRefs = (node: HTMLDivElement | null) => {
      setNodeRef(node);
      if (typeof forwardedRef === 'function') {
        forwardedRef(node);
      } else if (forwardedRef) {
        // Use Object.assign to avoid no-param-reassign lint error
        Object.assign(forwardedRef, { current: node });
      }
    };

    return (
      <div
        ref={setRefs}
        style={style}
        data-index={virtualIndex}
        {...attributes}
      >
        <SubmissionCard
          {...cardProps}
          draggable={draggable}
          dragHandleListeners={listeners}
        />
    </div>
  );
});
