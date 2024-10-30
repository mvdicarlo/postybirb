import type Sortable from 'sortablejs';

export function draggableIndexesAreDefined(
  event: Sortable.SortableEvent,
): event is {
  /**
   * Old index within parent, only counting draggable elements
   */
  oldDraggableIndex: number;
  /**
   * New index within parent, only counting draggable elements
   */
  newDraggableIndex: number;
} & Omit<Sortable.SortableEvent, 'oldDraggableIndex' | 'newDraggableIndex'> {
  if (
    typeof event.oldDraggableIndex === 'number' &&
    typeof event.newDraggableIndex === 'number'
  )
    return true;

  // eslint-disable-next-line lingui/no-unlocalized-strings, no-console
  console.error('Draggable indexes are undefined. Event:', event);
  return false;
}
