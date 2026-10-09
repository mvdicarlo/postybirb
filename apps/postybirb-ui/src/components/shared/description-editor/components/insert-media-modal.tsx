/* eslint-disable lingui/no-unlocalized-strings */
import { Trans } from '@lingui/react/macro';
import {
    Button,
    Group,
    Modal,
    NumberInput,
    SegmentedControl,
    Stack,
    TextInput,
} from '@mantine/core';
import type { Editor } from '@tiptap/react';
import { useCallback, useState } from 'react';

interface InsertMediaModalProps {
  editor: Editor;
  opened: boolean;
  onClose: () => void;
}

type MediaType = 'image' | 'video';

/**
 * Modal for inserting an image or video from a URL with optional width/height.
 */
export function InsertMediaModal({
  editor,
  opened,
  onClose,
}: InsertMediaModalProps) {
  const [mediaType, setMediaType] = useState<MediaType>('image');
  const [url, setUrl] = useState('');
  const [width, setWidth] = useState<number | ''>('');
  const [height, setHeight] = useState<number | ''>('');

  const reset = useCallback(() => {
    setUrl('');
    setWidth('');
    setHeight('');
    setMediaType('image');
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  const handleInsert = useCallback(() => {
    if (!url.trim()) return;

    const src = url.trim();

    if (mediaType === 'image') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const attrs: Record<string, any> = { src };
      if (width) attrs.width = width;
      if (height) attrs.height = height;
      editor.chain().focus().insertContent({ type: 'image', attrs }).run();
    } else {
      // Insert a video element via raw HTML
      const parts = [`<video src="${src}" controls`];
      if (width) parts.push(` width="${width}"`);
      if (height) parts.push(` height="${height}"`);
      parts.push('></video>');
      editor.chain().focus().insertContent(parts.join('')).run();
    }

    handleClose();
  }, [editor, url, width, height, mediaType, handleClose]);

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={<Trans>Insert Media</Trans>}
      size="sm"
    >
      <Stack gap="sm">
        <SegmentedControl
          fullWidth
          value={mediaType}
          onChange={(v) => setMediaType(v as MediaType)}
          data={[
            { label: 'Image', value: 'image' },
            { label: 'Video', value: 'video' },
          ]}
        />

        <TextInput
          label={<Trans>URL</Trans>}
          placeholder={
            mediaType === 'image'
              ? 'https://example.com/image.png'
              : 'https://example.com/video.mp4'
          }
          value={url}
          onChange={(e) => setUrl(e.currentTarget.value)}
          required
          data-autofocus
        />

        <Group grow>
          <NumberInput
            label={<Trans>Width</Trans>}
            placeholder="auto"
            value={width}
            onChange={(v) => setWidth(typeof v === 'number' ? v : '')}
            min={1}
            max={9999}
            allowNegative={false}
          />
          <NumberInput
            label={<Trans>Height</Trans>}
            placeholder="auto"
            value={height}
            onChange={(v) => setHeight(typeof v === 'number' ? v : '')}
            min={1}
            max={9999}
            allowNegative={false}
          />
        </Group>

        <Group justify="flex-end" mt="xs">
          <Button variant="subtle" onClick={handleClose}>
            <Trans>Cancel</Trans>
          </Button>
          <Button onClick={handleInsert} disabled={!url.trim()}>
            <Trans>Insert</Trans>
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
