/* eslint-disable lingui/no-unlocalized-strings */
import { Trans } from '@lingui/react/macro';
import {
    ActionIcon,
    Group,
    NumberInput,
    Popover,
    Stack,
    Text,
    Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconTrash } from '@tabler/icons-react';
import { mergeAttributes, Node } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import { useCallback, useEffect, useRef, useState } from 'react';

import '../custom-blocks/shortcut.css';

interface ResizableImageAttrs {
  src: string;
  alt: string;
  title: string;
  width: number | null;
  height: number | null;
}

/**
 * React component for the resizable image node view.
 * Shows a popover with width/height controls when clicked,
 * and drag handles on corners/edges for mouse-drag resizing.
 */
function ResizableImageView({
  node,
  updateAttributes,
  deleteNode,
  selected,
}: {
  node: { attrs: ResizableImageAttrs };
  updateAttributes: (attrs: Record<string, unknown>) => void;
  deleteNode: () => void;
  selected: boolean;
}) {
  const { src, alt, title, width, height } = node.attrs;
  const [opened, { open, close }] = useDisclosure(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Track whether the image is "active" (clicked on) to show handles
  const [active, setActive] = useState(false);

  // Natural aspect ratio — computed once when the image loads
  const aspectRatio = useRef<number>(1);

  // Local state for dimension inputs
  const [localWidth, setLocalWidth] = useState<number | ''>(width ?? '');
  const [localHeight, setLocalHeight] = useState<number | ''>(height ?? '');

  // Drag state
  const [dragging, setDragging] = useState(false);
  const dragState = useRef<{
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
    handle: string;
  } | null>(null);

  // Compute aspect ratio from natural image dimensions on load
  const handleImageLoad = useCallback(() => {
    const img = imgRef.current;
    if (img && img.naturalWidth && img.naturalHeight) {
      aspectRatio.current = img.naturalWidth / img.naturalHeight;
    }
  }, []);

  // Sync local state when node attrs change (undo/redo)
  useEffect(() => {
    setLocalWidth(width ?? '');
    setLocalHeight(height ?? '');
  }, [width, height]);

  // Close popover and deactivate on outside click
  useEffect(() => {
    if (!active && !opened) return undefined;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const inWrapper = wrapperRef.current?.contains(target);
      const inPopover = popoverRef.current?.contains(target);
      if (!inWrapper && !inPopover) {
        setActive(false);
        close();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [active, opened, close]);

  const commitDimensions = useCallback(
    (w: number | '', h: number | '') => {
      setLocalWidth(w);
      setLocalHeight(h);
      updateAttributes({
        width: w || null,
        height: h || null,
      });
    },
    [updateAttributes],
  );

  // Width changed in popover — compute height from aspect ratio
  const handleWidthChange = useCallback(
    (val: number | string) => {
      const v = typeof val === 'number' ? val : '';
      if (typeof v === 'number' && aspectRatio.current) {
        const newH = Math.round(v / aspectRatio.current);
        commitDimensions(v, newH);
      } else {
        commitDimensions(v, '');
      }
    },
    [commitDimensions],
  );

  // Height changed in popover — compute width from aspect ratio
  const handleHeightChange = useCallback(
    (val: number | string) => {
      const v = typeof val === 'number' ? val : '';
      if (typeof v === 'number' && aspectRatio.current) {
        const newW = Math.round(v * aspectRatio.current);
        commitDimensions(newW, v);
      } else {
        commitDimensions('', v);
      }
    },
    [commitDimensions],
  );

  // --- Drag resize logic ---
  const onDragStart = useCallback(
    (e: React.MouseEvent, handle: string) => {
      e.preventDefault();
      e.stopPropagation();
      const img = imgRef.current;
      if (!img) return;

      const rect = img.getBoundingClientRect();
      dragState.current = {
        startX: e.clientX,
        startY: e.clientY,
        startWidth: rect.width,
        startHeight: rect.height,
        handle,
      };
      setDragging(true);
    },
    [],
  );

  useEffect(() => {
    if (!dragging) return undefined;

    const onMouseMove = (e: MouseEvent) => {
      const ds = dragState.current;
      if (!ds) return;

      const dx = e.clientX - ds.startX;
      const dy = e.clientY - ds.startY;
      const ratio = aspectRatio.current;
      const { handle } = ds;

      // Determine primary delta based on handle direction
      let newWidth: number;

      if (handle.includes('left')) {
        newWidth = Math.max(20, ds.startWidth - dx);
      } else if (handle === 'bottom') {
        // Bottom-only: derive width from height change
        const newH = Math.max(20, ds.startHeight + dy);
        newWidth = Math.round(newH * ratio);
      } else {
        // right, or any corner
        newWidth = Math.max(20, ds.startWidth + dx);
      }

      newWidth = Math.round(newWidth);
      const newHeight = Math.round(newWidth / ratio);

      setLocalWidth(newWidth);
      setLocalHeight(newHeight);
    };

    const onMouseUp = () => {
      setDragging(false);
      // Commit final dimensions
      if (typeof localWidth === 'number' && typeof localHeight === 'number') {
        updateAttributes({
          width: localWidth,
          height: localHeight,
        });
      }
      dragState.current = null;
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [dragging, localWidth, localHeight, updateAttributes]);

  const handles = [
    { position: 'top-left', cursor: 'nwse-resize' },
    { position: 'top-right', cursor: 'nesw-resize' },
    { position: 'bottom-left', cursor: 'nesw-resize' },
    { position: 'bottom-right', cursor: 'nwse-resize' },
    { position: 'right', cursor: 'ew-resize' },
    { position: 'bottom', cursor: 'ns-resize' },
  ];

  const handleStyle = (pos: string, cursor: string): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: 'absolute',
      width: 8,
      height: 8,
      background: 'var(--mantine-color-blue-5)',
      border: '1px solid white',
      borderRadius: 2,
      cursor,
      zIndex: 10,
    };
    if (pos.includes('top')) base.top = -4;
    if (pos.includes('bottom')) base.bottom = -4;
    if (pos.includes('left')) base.left = -4;
    if (pos.includes('right') && pos.includes('-')) base.right = -4;

    // Edge-only handles (centered)
    if (pos === 'right') { base.right = -4; base.top = '50%'; base.transform = 'translateY(-50%)'; }
    if (pos === 'bottom') { base.bottom = -4; base.left = '50%'; base.transform = 'translateX(-50%)'; }

    return base;
  };

  return (
    <NodeViewWrapper as="span" style={{ display: 'inline-block', lineHeight: 0 }}>
      <Popover
        opened={opened}
        position="top"
        shadow="md"
        withArrow
        withinPortal
      >
        <Popover.Target>
          <div
            ref={wrapperRef}
            className={`resizable-image-wrapper${active || selected ? ' resizable-image-wrapper--active' : ''}`}
            style={{ position: 'relative', display: 'inline-block', lineHeight: 0 }}
          >
            {/* eslint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */}
            <img
              ref={imgRef}
              src={src}
              alt={alt}
              title={title}
              width={localWidth || undefined}
              height={localHeight || undefined}
              onLoad={handleImageLoad}
              onClick={(e) => {
                e.stopPropagation();
                setActive(true);
                open();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setActive(true);
                  open();
                }
              }}
              tabIndex={0}
              draggable={false}
              className={`resizable-image${selected ? ' resizable-image--selected' : ''}`}
              style={{
                cursor: 'pointer',
                maxWidth: '100%',
                display: 'block',
              }}
            />
            {/* eslint-enable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */}
            {/* Drag handles — only visible when active/selected */}
            {(active || selected) &&
              handles.map(({ position, cursor }) => (
                <div
                  key={position}
                  role="presentation"
                  className="resizable-image-handle"
                  style={handleStyle(position, cursor)}
                  onMouseDown={(e) => onDragStart(e, position)}
                />
              ))}
          </div>
        </Popover.Target>

        <Popover.Dropdown p="xs" ref={popoverRef}>
          <Stack gap={6}>
            <Text size="xs" fw={600} c="dimmed">
              <Trans>Image Size</Trans>
            </Text>
            <Group gap="xs" wrap="nowrap">
              <NumberInput
                label={<Trans>Width</Trans>}
                size="xs"
                value={localWidth}
                onChange={handleWidthChange}
                placeholder="auto"
                min={1}
                max={9999}
                allowNegative={false}
                style={{ width: 90 }}
              />
              <Text size="xs" c="dimmed" mt={24}>
                ×
              </Text>
              <NumberInput
                label={<Trans>Height</Trans>}
                size="xs"
                value={localHeight}
                onChange={handleHeightChange}
                placeholder="auto"
                min={1}
                max={9999}
                allowNegative={false}
                style={{ width: 90 }}
              />
              <Tooltip label={<Trans>Remove image</Trans>} withArrow>
                <ActionIcon
                  variant="subtle"
                  color="red"
                  size="sm"
                  mt={24}
                  onClick={() => {
                    close();
                    deleteNode();
                  }}
                >
                  <IconTrash size={14} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Stack>
        </Popover.Dropdown>
      </Popover>
    </NodeViewWrapper>
  );
}

/**
 * Custom TipTap Image extension with resizable node view.
 * Extends the default Image node with width/height attributes
 * and a click-to-edit popover.
 */
export const ResizableImageExtension = Node.create({
  name: 'image',
  group: 'inline',
  inline: true,
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: '' },
      title: { default: '' },
      width: { default: null },
      height: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'img[src]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['img', mergeAttributes(HTMLAttributes)];
  },

  addNodeView() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ReactNodeViewRenderer(ResizableImageView as any);
  },

  addCommands() {
    return {
      setImage:
        (attrs: { src: string; alt?: string; title?: string; width?: number; height?: number }) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ({ commands }: { commands: any }) => commands.insertContent({
            type: this.name,
            attrs,
          }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  },
});
