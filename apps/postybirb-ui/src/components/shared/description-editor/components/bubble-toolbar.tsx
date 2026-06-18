/* eslint-disable lingui/no-unlocalized-strings */
import {
    ActionIcon,
    Button,
    ColorInput,
    Group,
    Modal,
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
import { useCallback, useRef, useState } from 'react';

interface BubbleToolbarProps {
  editor: Editor;
}

/**
 * Floating toolbar that appears on text selection.
 * Shows compact inline formatting options.
 */
export function BubbleToolbar({ editor }: BubbleToolbarProps) {
  const [colorOpened, { open: openColor, close: closeColor }] =
    useDisclosure(false);
  // Selection captured when the color picker opened. Applied to this range
  // so focus moving to the modal does not result in an empty selection.
  const savedRangeRef = useRef<{ from: number; to: number } | null>(null);
  // Local state for the modal's color input so the user can scrub through
  // the gradient without each intermediate value being committed to history.
  const [pendingColor, setPendingColor] = useState<string>('');

  const handleOpenColor = useCallback(() => {
    const { from, to } = editor.state.selection;
    if (from === to) return; // nothing selected
    savedRangeRef.current = { from, to };
    const current =
      (editor.getAttributes('textStyle')?.color as string | undefined) || '';
    setPendingColor(current);
    openColor();
  }, [editor, openColor]);

  const applyColor = useCallback(
    (color: string) => {
      const range = savedRangeRef.current;
      if (!range) return;
      const chain = editor.chain().setTextSelection(range);
      if (color) {
        chain.setColor(color).run();
      } else {
        chain.unsetColor().run();
      }
    },
    [editor],
  );

  const handleClose = useCallback(() => {
    const range = savedRangeRef.current;
    closeColor();
    savedRangeRef.current = null;
    if (range) {
      editor.chain().focus().setTextSelection(range).run();
    } else {
      editor.commands.focus();
    }
  }, [editor, closeColor]);

  const handleConfirm = useCallback(() => {
    applyColor(pendingColor);
    handleClose();
  }, [applyColor, pendingColor, handleClose]);

  const handleClear = useCallback(() => {
    applyColor('');
    handleClose();
  }, [applyColor, handleClose]);

  const currentColor = editor.getAttributes('textStyle')?.color || '';

  return (
    <>
      <BubbleMenu
        editor={editor}
        options={{
          placement: 'top',
          offset: 8,
          flip: true,
          shift: true,
          inline: true,
        }}
      >
        <div className="pb-bubble-menu" role="toolbar">
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
            <Tooltip label="Text Color" withArrow openDelay={300}>
              <ActionIcon
                size="xs"
                variant="subtle"
                color="gray"
                style={currentColor ? { color: currentColor } : undefined}
                // Capture the selection on mousedown so that the click doesn't
                // collapse it before we can save the range.
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleOpenColor();
                }}
              >
                <span style={{ fontWeight: 'bold', fontSize: '12px' }}>A</span>
              </ActionIcon>
            </Tooltip>
          </Group>
        </div>
      </BubbleMenu>
      <Modal
        opened={colorOpened}
        onClose={handleClose}
        title="Text Color"
        size="sm"
        centered
        zIndex={1000}
      >
        <ColorInput
          value={pendingColor}
          onChange={setPendingColor}
          format="hex"
          popoverProps={{ zIndex: 1100, withinPortal: true }}
          swatches={[
            '#000000',
            '#868e96',
            '#fa5252',
            '#e64980',
            '#be4bdb',
            '#7950f2',
            '#4c6ef5',
            '#228be6',
            '#15aabf',
            '#12b886',
            '#40c057',
            '#82c91e',
            '#fab005',
            '#fd7e14',
          ]}
          swatchesPerRow={7}
        />
        <Group justify="flex-end" mt="md" gap="xs">
          <Button variant="subtle" color="red" onClick={handleClear} size="xs">
            Clear
          </Button>
          <Button variant="filled" onClick={handleConfirm} size="xs">
            Apply
          </Button>
        </Group>
      </Modal>
    </>
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
