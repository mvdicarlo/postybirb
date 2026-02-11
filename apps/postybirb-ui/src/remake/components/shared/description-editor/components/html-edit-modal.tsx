/* eslint-disable lingui/no-unlocalized-strings */
import { Button, Group, Modal, Textarea } from '@mantine/core';
import type { Editor } from '@tiptap/react';
import { useCallback, useEffect, useState } from 'react';

interface HtmlEditModalProps {
  editor: Editor;
  opened: boolean;
  onClose: () => void;
}

/**
 * Modal that lets users view and edit the raw HTML of the editor content.
 */
export function HtmlEditModal({ editor, opened, onClose }: HtmlEditModalProps) {
  const [html, setHtml] = useState('');

  // Sync editor HTML into state when the modal opens
  useEffect(() => {
    if (opened) {
      setHtml(editor.getHTML());
    }
  }, [opened, editor]);

  const handleApply = useCallback(() => {
    editor.commands.setContent(html, { emitUpdate: true });
    onClose();
  }, [editor, html, onClose]);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Edit HTML"
      size="xl"
      centered
    >
      <Textarea
        value={html}
        onChange={(e) => setHtml(e.currentTarget.value)}
        autosize
        minRows={10}
        maxRows={25}
        styles={{
          input: {
            fontFamily: 'monospace',
            fontSize: '13px',
          },
        }}
      />
      <Group justify="flex-end" mt="md">
        <Button variant="subtle" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleApply}>Apply</Button>
      </Group>
    </Modal>
  );
}
