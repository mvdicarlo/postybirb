/**
 * DependencyReorderableTree - nested list for the post-confirm modal.
 *
 * Renders a {@link DependencyNode} forest with prerequisites as parents and
 * their dependents nested beneath. Only the top-level roots are drag/keyboard
 * reorderable (that order becomes the queue order); nested dependents are shown
 * read-only because they always post after their prerequisite regardless of
 * sibling order.
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
import { Box, Group, Paper, ScrollArea, Stack, Text } from '@mantine/core';
import { IconGripVertical } from '@tabler/icons-react';
import { useCallback } from 'react';
import type { DependencyNode } from './dependency-tree';
import { reorderForestGroup } from './dependency-tree';

export interface DependencyReorderableTreeProps {
  /** The forest to render. */
  forest: DependencyNode[];
  /**
   * Called with the updated forest after a top-level reorder. Not needed when
   * `readOnly` is set.
   */
  onForestChange?: (forest: DependencyNode[]) => void;
  /** Renders the row body (title, website chips, "waits for" chips) for a node. */
  renderRow: (node: DependencyNode) => React.ReactNode;
  /** Maximum height of the scroll area. */
  maxHeight?: string | number;
  /** Render the whole tree read-only (no drag handles / reordering). */
  readOnly?: boolean;
}

/** Reorder handler for the (top-level) root group. */
type ReorderFn = (nodes: DependencyNode[]) => void;

export function DependencyReorderableTree({
  forest,
  onForestChange,
  renderRow,
  maxHeight = '340px',
  readOnly = false,
}: DependencyReorderableTreeProps) {
  const handleReorder = useCallback<ReorderFn>(
    (nodes) => {
      onForestChange?.(reorderForestGroup(forest, null, nodes));
    },
    [forest, onForestChange],
  );

  return (
    <Box className="postybirb__reorderable-container">
      <Text size="xs" c="dimmed" mb="xs">
        {readOnly ? (
          <Trans>Dependents are grouped under the submission they wait for.</Trans>
        ) : (
          <Trans>
            Drag or use arrow keys to reorder. Dependents are grouped under the
            submission they wait for and post after it.
          </Trans>
        )}
      </Text>
      <Box style={{ overflow: 'hidden', maxHeight }}>
        <ScrollArea h="100%" scrollbars="y">
          {readOnly ? (
            <Stack gap="xs">
              {forest.map((node) => (
                <StaticTreeItem
                  key={node.submission.id}
                  node={node}
                  renderRow={renderRow}
                />
              ))}
            </Stack>
          ) : (
            <RootGroup
              nodes={forest}
              onReorder={handleReorder}
              renderRow={renderRow}
            />
          )}
        </ScrollArea>
      </Box>
    </Box>
  );
}

/** The reorderable top-level group, wrapped in its own DnD context. */
function RootGroup({
  nodes,
  onReorder,
  renderRow,
}: {
  nodes: DependencyNode[];
  onReorder: ReorderFn;
  renderRow: (node: DependencyNode) => React.ReactNode;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = nodes.findIndex((n) => n.submission.id === active.id);
      const newIndex = nodes.findIndex((n) => n.submission.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        onReorder(arrayMove(nodes, oldIndex, newIndex));
      }
    },
    [nodes, onReorder],
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={nodes.map((n) => n.submission.id)}
        strategy={verticalListSortingStrategy}
      >
        <Stack gap="xs">
          {nodes.map((node) => (
            <SortableTreeItem
              key={node.submission.id}
              node={node}
              renderRow={renderRow}
            />
          ))}
        </Stack>
      </SortableContext>
    </DndContext>
  );
}

/** A draggable root node plus (read-only) its nested dependents. */
function SortableTreeItem({
  node,
  renderRow,
}: {
  node: DependencyNode;
  renderRow: (node: DependencyNode) => React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: node.submission.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Box ref={setNodeRef} style={style}>
      <Paper
        withBorder
        p="xs"
        radius="sm"
        className="postybirb__reorderable-item"
      >
        <Group gap="xs" wrap="nowrap" align="flex-start">
          <Box
            className="postybirb__reorderable-handle"
            {...attributes}
            {...listeners}
            style={{ cursor: 'grab', paddingTop: 2 }}
          >
            <IconGripVertical size={16} />
          </Box>
          <Box style={{ flex: 1, minWidth: 0 }}>{renderRow(node)}</Box>
        </Group>
      </Paper>
      {node.children.length > 0 && (
        <StaticChildren nodes={node.children} renderRow={renderRow} />
      )}
    </Box>
  );
}

/** Read-only nested group of dependents (no drag/reorder). */
function StaticChildren({
  nodes,
  renderRow,
}: {
  nodes: DependencyNode[];
  renderRow: (node: DependencyNode) => React.ReactNode;
}) {
  return (
    <Box
      mt="xs"
      ml="lg"
      pl="xs"
      style={{ borderLeft: '2px solid var(--mantine-color-default-border)' }}
    >
      <Stack gap="xs">
        {nodes.map((node) => (
          <StaticTreeItem
            key={node.submission.id}
            node={node}
            renderRow={renderRow}
          />
        ))}
      </Stack>
    </Box>
  );
}

/** A single read-only nested node plus (recursively) its own dependents. */
function StaticTreeItem({
  node,
  renderRow,
}: {
  node: DependencyNode;
  renderRow: (node: DependencyNode) => React.ReactNode;
}) {
  return (
    <Box>
      <Paper
        withBorder
        p="xs"
        radius="sm"
        className="postybirb__reorderable-item"
      >
        {renderRow(node)}
      </Paper>
      {node.children.length > 0 && (
        <StaticChildren nodes={node.children} renderRow={renderRow} />
      )}
    </Box>
  );
}
