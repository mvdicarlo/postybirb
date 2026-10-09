/* eslint-disable lingui/no-unlocalized-strings */
import { ActionIcon, Group, Tooltip } from '@mantine/core';
import {
  IconBold,
  IconItalic,
  IconStrikethrough,
  IconUnderline,
} from '@tabler/icons-react';
import type { Editor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';

interface BubbleToolbarProps {
  editor: Editor;
}

/**
 * Floating toolbar that appears on text selection.
 * Shows compact inline formatting options.
 */
export function BubbleToolbar({ editor }: BubbleToolbarProps) {
  return (
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
        </Group>
      </div>
    </BubbleMenu>
  );
}

/** Helper button for the bubble menu */
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
