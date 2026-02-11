/* eslint-disable lingui/no-unlocalized-strings */
import {
    ActionIcon,
    CloseButton,
    ColorInput,
    Group,
    Popover,
    Stack,
    Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
    IconBold,
    IconItalic,
    IconStrikethrough,
    IconUnderline,
} from '@tabler/icons-react';
import type { Editor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import { useCallback, useEffect, useRef } from 'react';

interface BubbleToolbarProps {
  editor: Editor;
}

/**
 * Floating toolbar that appears on text selection.
 * Shows compact inline formatting options.
 */
export function BubbleToolbar({ editor }: BubbleToolbarProps) {
  const [colorOpened, { toggle: toggleColor, close: closeColor }] = useDisclosure(false);
  const bubbleRef = useRef<HTMLDivElement>(null);

  // Close the color picker when the selection collapses (bubble menu hides)
  useEffect(() => {
    const handler = () => {
      const { from, to } = editor.state.selection;
      if (from === to) {
        closeColor();
      }
    };
    editor.on('selectionUpdate', handler);
    return () => {
      editor.off('selectionUpdate', handler);
    };
  }, [editor, closeColor]);

  const handleColorChange = useCallback(
    (color: string) => {
      if (color) {
        editor.chain().focus().setColor(color).run();
      } else {
        editor.chain().focus().unsetColor().run();
      }
    },
    [editor],
  );

  const currentColor = editor.getAttributes('textStyle')?.color || '';

  return (
    <BubbleMenu
      editor={editor}
      options={{ placement: 'top', offset: 8, flip: true, shift: true, inline: true }}
    >
      <div
        className="pb-bubble-menu"
        ref={bubbleRef}
        role="toolbar"
        onMouseDown={(e) => {
          // Prevent blur when interacting with the color picker
          if (colorOpened) {
            e.preventDefault();
          }
        }}
      >
        <Group
          gap={2}
          p={4}
          style={{
            background: 'var(--mantine-color-body)',
            border: '1px solid var(--mantine-color-default-border)',
            borderRadius: 'var(--mantine-radius-md)',
            boxShadow: 'var(--mantine-shadow-md)',
          }}
        >
          <BubbleButton
            icon={<IconBold size={14} />}
            label="Bold"
            isActive={editor.isActive('bold')}
            onClick={() => editor.chain().focus().toggleBold().run()}
          />
          <BubbleButton
            icon={<IconItalic size={14} />}
            label="Italic"
            isActive={editor.isActive('italic')}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          />
          <BubbleButton
            icon={<IconUnderline size={14} />}
            label="Underline"
            isActive={editor.isActive('underline')}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          />
          <BubbleButton
            icon={<IconStrikethrough size={14} />}
            label="Strike"
            isActive={editor.isActive('strike')}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          />
          <Popover
            opened={colorOpened}
            onClose={closeColor}
            width={220}
            shadow="md"
            withinPortal={false}
            position="bottom"
          >
            <Popover.Target>
              <Tooltip label="Text Color" withArrow openDelay={300}>
                <ActionIcon
                  size="xs"
                  variant="subtle"
                  color="gray"
                  style={currentColor ? { color: currentColor } : undefined}
                  onClick={toggleColor}
                >
                  <span style={{ fontWeight: 'bold', fontSize: '12px' }}>A</span>
                </ActionIcon>
              </Tooltip>
            </Popover.Target>
            <Popover.Dropdown
              onMouseDown={(e: React.MouseEvent) => e.preventDefault()}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === 'Escape') {
                  closeColor();
                  editor.commands.focus();
                }
              }}
            >
              <Stack gap={4}>
                <Group justify="flex-end">
                  <CloseButton size="xs" onClick={() => { closeColor(); editor.commands.focus(); }} />
                </Group>
                <ColorInput
                  size="xs"
                  value={currentColor}
                  onChange={handleColorChange}
                  swatches={[
                    '#000000', '#868e96', '#fa5252', '#e64980', '#be4bdb',
                    '#7950f2', '#4c6ef5', '#228be6', '#15aabf', '#12b886',
                    '#40c057', '#82c91e', '#fab005', '#fd7e14',
                  ]}
                  swatchesPerRow={7}
                />
              </Stack>
            </Popover.Dropdown>
          </Popover>
        </Group>
      </div>
    </BubbleMenu>
  );
}

function BubbleButton({
  icon,
  label,
  isActive,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <Tooltip label={label} withArrow openDelay={150}>
      <ActionIcon
        size="xs"
        variant={isActive ? 'filled' : 'subtle'}
        color={isActive ? 'blue' : 'gray'}
        onClick={onClick}
      >
        {icon}
      </ActionIcon>
    </Tooltip>
  );
}
