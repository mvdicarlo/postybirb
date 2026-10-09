/* eslint-disable lingui/no-unlocalized-strings */
import { Trans } from '@lingui/react/macro';
import {
  ActionIcon,
  Button,
  CloseButton,
  ColorPicker,
  Divider,
  Group,
  Modal,
  Popover,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconAlignCenter,
  IconAlignLeft,
  IconAlignRight,
  IconArrowBackUp,
  IconArrowForwardUp,
  IconBold,
  IconColorPicker,
  IconEraser,
  IconEye,
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
  IconPhoto,
  IconSourceCode,
  IconStrikethrough,
  IconUnderline,
} from '@tabler/icons-react';
import type { Editor } from '@tiptap/react';
import { useCallback, useEffect, useRef, useState } from 'react';

interface DescriptionToolbarProps {
  editor: Editor | null;
  onEditHtml?: () => void;
  onInsertMedia?: () => void;
  onPreview?: () => void;
}

/**
 * Fixed toolbar rendered above the TipTap editor.
 * Each button reads editor state for active styling and dispatches the appropriate command.
 */
export function DescriptionToolbar({
  editor,
  onEditHtml,
  onInsertMedia,
  onPreview,
}: DescriptionToolbarProps) {
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
        icon={<IconBold size={16} />}
        label="Bold"
        isActive={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
      />
      <ToolbarButton
        icon={<IconItalic size={16} />}
        label="Italic"
        isActive={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      />
      <ToolbarButton
        icon={<IconUnderline size={16} />}
        label="Underline"
        isActive={editor.isActive('underline')}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      />
      <ToolbarButton
        icon={<IconStrikethrough size={16} />}
        label="Strikethrough"
        isActive={editor.isActive('strike')}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      />
      <TextColorButton editor={editor} />

      <Divider orientation="vertical" mx={4} />

      {/* Headings */}
      <ToolbarButton
        icon={<IconH1 size={16} />}
        label="Heading 1"
        isActive={editor.isActive('heading', { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      />
      <ToolbarButton
        icon={<IconH2 size={16} />}
        label="Heading 2"
        isActive={editor.isActive('heading', { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      />
      <ToolbarButton
        icon={<IconH3 size={16} />}
        label="Heading 3"
        isActive={editor.isActive('heading', { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      />

      <Divider orientation="vertical" mx={4} />

      {/* Block types */}
      <ToolbarButton
        icon={<IconList size={16} />}
        label="Bullet List"
        isActive={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      />
      <ToolbarButton
        icon={<IconListNumbers size={16} />}
        label="Ordered List"
        isActive={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      />

      <Divider orientation="vertical" mx={4} />

      {/* Insert */}
      <ToolbarButton
        icon={<IconLine size={16} />}
        label="Horizontal Rule"
        isActive={false}
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
      />
      <LinkButton editor={editor} />
      <ToolbarButton
        icon={<IconPhoto size={16} />}
        label="Insert Image / Video"
        isActive={false}
        onClick={() => onInsertMedia?.()}
      />

      <Divider orientation="vertical" mx={4} />

      {/* Alignment */}
      <ToolbarButton
        icon={<IconAlignLeft size={16} />}
        label="Align Left"
        isActive={editor.isActive({ textAlign: 'left' })}
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
      />
      <ToolbarButton
        icon={<IconAlignCenter size={16} />}
        label="Align Center"
        isActive={editor.isActive({ textAlign: 'center' })}
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
      />
      <ToolbarButton
        icon={<IconAlignRight size={16} />}
        label="Align Right"
        isActive={editor.isActive({ textAlign: 'right' })}
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
      />

      <Divider orientation="vertical" mx={4} />

      {/* Indent */}
      <ToolbarButton
        icon={<IconIndentIncrease size={16} />}
        label="Indent"
        isActive={false}
        onClick={() => editor.chain().focus().indent().run()}
      />
      <ToolbarButton
        icon={<IconIndentDecrease size={16} />}
        label="Outdent"
        isActive={false}
        onClick={() => editor.chain().focus().outdent().run()}
      />

      <Divider orientation="vertical" mx={4} />

      {/* History */}
      <ToolbarButton
        icon={<IconArrowBackUp size={16} />}
        label="Undo"
        isActive={false}
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
      />
      <ToolbarButton
        icon={<IconArrowForwardUp size={16} />}
        label="Redo"
        isActive={false}
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
      />

      <Divider orientation="vertical" mx={4} />

      {/* HTML source */}
      <ToolbarButton
        icon={<IconSourceCode size={16} />}
        label="Edit HTML"
        isActive={false}
        onClick={() => onEditHtml?.()}
      />

      {/* Preview parsed description */}
      {onPreview && (
        <ToolbarButton
          icon={<IconEye size={16} />}
          label="Preview"
          isActive={false}
          onClick={() => onPreview()}
        />
      )}
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
  const [opened, { open, close }] = useDisclosure(false);
  const [url, setUrl] = useState('');

  // Read clipboard text when modal opens
  useEffect(() => {
    if (opened) {
      const getClipboardUrl = async () => {
        try {
          const text = await navigator.clipboard.readText();

          if (text.startsWith('http://') || text.startsWith('https://')) {
            setUrl(text);
          } else {
            setUrl('');
          }
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn('Failed to read clipboard:', err);
          setUrl('');
        }
      };
      getClipboardUrl();
    }
  }, [opened]);

  const handleInsertLink = useCallback(() => {
    if (url && url.trim()) {
      editor.chain().focus().setLink({ href: url.trim() }).run();
    }
    close();
    setUrl('');
  }, [editor, url, close]);

  const handleRemoveLink = useCallback(() => {
    editor.chain().focus().unsetLink().run();
  }, [editor]);

  const handleMainClick = useCallback(() => {
    if (isActive) {
      handleRemoveLink();
    } else {
      open();
    }
  }, [isActive, handleRemoveLink, open]);

  return (
    <>
      <Tooltip
        label={isActive ? 'Remove Link' : 'Insert Link'}
        withArrow
        openDelay={500}
      >
        <ActionIcon
          size="sm"
          variant={isActive ? 'filled' : 'subtle'}
          color={isActive ? 'blue' : 'gray'}
          onClick={handleMainClick}
        >
          <IconLink size={16} />
        </ActionIcon>
      </Tooltip>

      <Modal
        opened={opened}
        onClose={close}
        title="Insert Link"
        size="md"
        centered
      >
        <TextInput
          label="URL"
          placeholder="https://example.com"
          value={url}
          onChange={(event) => setUrl(event.currentTarget.value)}
          data-autofocus
          mb="md"
        />
        <Group justify="flex-end">
          <Button variant="default" onClick={close}>
            <Trans>Cancel</Trans>
          </Button>
          <Button onClick={handleInsertLink} disabled={!url.trim()}>
            <Trans>Insert</Trans>
          </Button>
        </Group>
      </Modal>
    </>
  );
}

/** Text color picker button */
function TextColorButton({ editor }: { editor: Editor }) {
  const [opened, { toggle, close }] = useDisclosure(false);
  const currentColor = editor.getAttributes('textStyle')?.color || '';

  const handleChange = useCallback(
    (newColor: string) => {
      setColor(newColor);
      const range = savedRangeRef.current;
      let chain = editor.chain();
      if (range) {
        chain = chain.setTextSelection(range);
      }
      if (newColor && newColor.trim() !== '') {
        chain.setColor(newColor).run();
      } else {
        chain.unsetColor().run();
      }
    },
    [editor],
  );

  const [color, setColor] = useState(currentColor);
  const [isPicking, setIsPicking] = useState(false);
  const savedRangeRef = useRef<{ from: number; to: number } | null>(null);

  // Sync local state when editor color changes externally
  useEffect(() => {
    setColor(currentColor);
  }, [currentColor]);

  // Save selection when popover opens
  useEffect(() => {
    if (opened) {
      const { from, to } = editor.state.selection;
      if (from !== to) {
        savedRangeRef.current = { from, to };
      } else {
        savedRangeRef.current = null;
      }
    }
  }, [opened, editor]);

  const handleReset = useCallback(() => {
    // unsetColor
    handleChange('');
  }, [handleChange]);

  const handleEyeDropper = useCallback(async () => {
    if (!('EyeDropper' in window)) return;
    try {
      setIsPicking(true);
      const eyeDropper = new (
        window as unknown as {
          EyeDropper: { new (): { open(): Promise<{ sRGBHex: string }> } };
        }
      ).EyeDropper();
      const result = await eyeDropper.open();
      const hexColor = result.sRGBHex;
      if (hexColor) {
        handleChange(hexColor);
      }
    } catch {
      // user cancelled
    } finally {
      setIsPicking(false);
    }
  }, [handleChange]);

  const handleClose = useCallback(() => {
    close();
    if (savedRangeRef.current) {
      editor.chain().focus().setTextSelection(savedRangeRef.current).run();
      savedRangeRef.current = null;
    } else {
      editor.commands.focus();
    }
  }, [close, editor]);

  return (
    <Popover
      opened={opened}
      onClose={handleClose}
      width={280}
      shadow="md"
      position="top"
    >
      <Popover.Target>
        <Tooltip label="Text Color" withArrow openDelay={500}>
          <ActionIcon
            size="sm"
            variant="subtle"
            color="gray"
            style={currentColor ? { color: currentColor } : undefined}
            onClick={toggle}
          >
            <span style={{ fontWeight: 'bold', fontSize: '14px' }}>A</span>
          </ActionIcon>
        </Tooltip>
      </Popover.Target>
      <Popover.Dropdown
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === 'Escape') handleClose();
        }}
      >
        <Stack gap={4}>
          <Group justify="space-between">
            <Text>Pick Color</Text>
            <CloseButton size="sm" onClick={handleClose} />
          </Group>

          <ColorPicker
            value={color}
            onChange={handleChange}
            format="hex"
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

          <Group gap={4} align="center">
            <TextInput
              size="xs"
              style={{ flex: 1 }}
              value={color}
              onChange={(e) => handleChange(e.currentTarget.value)}
              placeholder="Enter hex color (e.g. #ff0000)"
            />
            {'EyeDropper' in window && (
              <Tooltip label="Pick color from screen" withArrow openDelay={500}>
                <ActionIcon
                  size="sm"
                  variant="subtle"
                  color="gray"
                  onClick={handleEyeDropper}
                  disabled={isPicking}
                  aria-label="Pick color from screen"
                >
                  <IconColorPicker size={16} />
                </ActionIcon>
              </Tooltip>
            )}
            <Tooltip label="Reset color" withArrow openDelay={500}>
              <ActionIcon
                size="xs"
                variant="subtle"
                color="red"
                onClick={handleReset}
                aria-label="Reset color"
              >
                <IconEraser size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
