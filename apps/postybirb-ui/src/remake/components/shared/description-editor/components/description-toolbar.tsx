/* eslint-disable lingui/no-unlocalized-strings */
import { ActionIcon, ColorInput, Divider, Group, Menu, Tooltip } from '@mantine/core';
import {
    IconAlignCenter,
    IconAlignLeft,
    IconAlignRight,
    IconArrowBackUp,
    IconArrowForwardUp,
    IconBlockquote,
    IconBold,
    IconCode,
    IconH1,
    IconH2,
    IconH3,
    IconIndentDecrease,
    IconIndentIncrease,
    IconItalic,
    IconLine,
    IconLink,
    IconList,
    IconListNumbers,
    IconStrikethrough,
    IconUnderline,
} from '@tabler/icons-react';
import type { Editor } from '@tiptap/react';
import { useCallback } from 'react';

interface DescriptionToolbarProps {
  editor: Editor | null;
}

/**
 * Fixed toolbar rendered above the TipTap editor.
 * Each button reads editor state for active styling and dispatches the appropriate command.
 */
export function DescriptionToolbar({ editor }: DescriptionToolbarProps) {
  if (!editor) return null;

  return (
    <Group
      gap={2}
      p={4}
      style={{
        borderBottom: '1px solid var(--mantine-color-default-border)',
        flexWrap: 'wrap',
      }}
    >
      {/* Formatting */}
      <ToolbarButton
        editor={editor}
        icon={<IconBold size={16} />}
        label="Bold"
        isActive={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
      />
      <ToolbarButton
        editor={editor}
        icon={<IconItalic size={16} />}
        label="Italic"
        isActive={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      />
      <ToolbarButton
        editor={editor}
        icon={<IconUnderline size={16} />}
        label="Underline"
        isActive={editor.isActive('underline')}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      />
      <ToolbarButton
        editor={editor}
        icon={<IconStrikethrough size={16} />}
        label="Strikethrough"
        isActive={editor.isActive('strike')}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      />
      <ToolbarButton
        editor={editor}
        icon={<IconCode size={16} />}
        label="Code"
        isActive={editor.isActive('code')}
        onClick={() => editor.chain().focus().toggleCode().run()}
      />

      <Divider orientation="vertical" mx={4} />

      {/* Headings */}
      <ToolbarButton
        editor={editor}
        icon={<IconH1 size={16} />}
        label="Heading 1"
        isActive={editor.isActive('heading', { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      />
      <ToolbarButton
        editor={editor}
        icon={<IconH2 size={16} />}
        label="Heading 2"
        isActive={editor.isActive('heading', { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      />
      <ToolbarButton
        editor={editor}
        icon={<IconH3 size={16} />}
        label="Heading 3"
        isActive={editor.isActive('heading', { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      />

      <Divider orientation="vertical" mx={4} />

      {/* Block types */}
      <ToolbarButton
        editor={editor}
        icon={<IconBlockquote size={16} />}
        label="Blockquote"
        isActive={editor.isActive('blockquote')}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      />
      <ToolbarButton
        editor={editor}
        icon={<IconList size={16} />}
        label="Bullet List"
        isActive={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      />
      <ToolbarButton
        editor={editor}
        icon={<IconListNumbers size={16} />}
        label="Ordered List"
        isActive={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      />

      <Divider orientation="vertical" mx={4} />

      {/* Insert */}
      <ToolbarButton
        editor={editor}
        icon={<IconLine size={16} />}
        label="Horizontal Rule"
        isActive={false}
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
      />
      <LinkButton editor={editor} />

      <Divider orientation="vertical" mx={4} />

      {/* Alignment */}
      <ToolbarButton
        editor={editor}
        icon={<IconAlignLeft size={16} />}
        label="Align Left"
        isActive={editor.isActive({ textAlign: 'left' })}
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
      />
      <ToolbarButton
        editor={editor}
        icon={<IconAlignCenter size={16} />}
        label="Align Center"
        isActive={editor.isActive({ textAlign: 'center' })}
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
      />
      <ToolbarButton
        editor={editor}
        icon={<IconAlignRight size={16} />}
        label="Align Right"
        isActive={editor.isActive({ textAlign: 'right' })}
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
      />

      <Divider orientation="vertical" mx={4} />

      {/* Indent */}
      <ToolbarButton
        editor={editor}
        icon={<IconIndentIncrease size={16} />}
        label="Indent"
        isActive={false}
        onClick={() => editor.chain().focus().indent().run()}
      />
      <ToolbarButton
        editor={editor}
        icon={<IconIndentDecrease size={16} />}
        label="Outdent"
        isActive={false}
        onClick={() => editor.chain().focus().outdent().run()}
      />

      <Divider orientation="vertical" mx={4} />

      {/* Text color */}
      <TextColorButton editor={editor} />

      <Divider orientation="vertical" mx={4} />

      {/* History */}
      <ToolbarButton
        editor={editor}
        icon={<IconArrowBackUp size={16} />}
        label="Undo"
        isActive={false}
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
      />
      <ToolbarButton
        editor={editor}
        icon={<IconArrowForwardUp size={16} />}
        label="Redo"
        isActive={false}
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
      />
    </Group>
  );
}

/** Generic toolbar action icon button */
function ToolbarButton({
  icon,
  label,
  isActive,
  onClick,
  disabled,
}: {
  editor: Editor;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Tooltip label={label} withArrow openDelay={500}>
      <ActionIcon
        size="sm"
        variant={isActive ? 'filled' : 'subtle'}
        color={isActive ? 'blue' : 'gray'}
        onClick={onClick}
        disabled={disabled}
      >
        {icon}
      </ActionIcon>
    </Tooltip>
  );
}

/** Link insert button with URL prompt */
function LinkButton({ editor }: { editor: Editor }) {
  const isActive = editor.isActive('link');

  const handleClick = useCallback(() => {
    if (isActive) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    // eslint-disable-next-line no-alert
    const url = window.prompt('Enter URL');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  }, [editor, isActive]);

  return (
    <Tooltip label={isActive ? 'Remove Link' : 'Insert Link'} withArrow openDelay={500}>
      <ActionIcon
        size="sm"
        variant={isActive ? 'filled' : 'subtle'}
        color={isActive ? 'blue' : 'gray'}
        onClick={handleClick}
      >
        <IconLink size={16} />
      </ActionIcon>
    </Tooltip>
  );
}

/** Text color picker button */
function TextColorButton({ editor }: { editor: Editor }) {
  const currentColor = editor.getAttributes('textStyle')?.color || '';

  const handleChange = useCallback(
    (color: string) => {
      if (color) {
        editor.chain().focus().setColor(color).run();
      } else {
        editor.chain().focus().unsetColor().run();
      }
    },
    [editor],
  );

  return (
    <Menu shadow="md" width={220}>
      <Menu.Target>
        <Tooltip label="Text Color" withArrow openDelay={500}>
          <ActionIcon
            size="sm"
            variant="subtle"
            color="gray"
            style={currentColor ? { color: currentColor } : undefined}
          >
            <span style={{ fontWeight: 'bold', fontSize: '14px' }}>A</span>
          </ActionIcon>
        </Tooltip>
      </Menu.Target>
      <Menu.Dropdown>
        <ColorInput
          size="xs"
          value={currentColor}
          onChange={handleChange}
          swatches={[
            '#000000', '#868e96', '#fa5252', '#e64980', '#be4bdb',
            '#7950f2', '#4c6ef5', '#228be6', '#15aabf', '#12b886',
            '#40c057', '#82c91e', '#fab005', '#fd7e14',
          ]}
          swatchesPerRow={7}
        />
      </Menu.Dropdown>
    </Menu>
  );
}
