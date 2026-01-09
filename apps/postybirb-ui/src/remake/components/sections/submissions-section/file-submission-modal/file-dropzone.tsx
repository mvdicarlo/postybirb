/**
 * FileDropzone - Dropzone component for file uploads.
 */

import { Trans } from '@lingui/react/macro';
import { Box, Button, Group, Text, Tooltip } from '@mantine/core';
import {
  Dropzone,
  FileWithPath,
  IMAGE_MIME_TYPE,
  MS_WORD_MIME_TYPE,
  PDF_MIME_TYPE,
} from '@mantine/dropzone';
import { SubmissionType } from '@postybirb/types';
import {
  IconClipboard,
  IconPhoto,
  IconUpload,
  IconX,
} from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import './file-submission-modal.css';
import {
  TEXT_MIME_TYPES,
  VIDEO_MIME_TYPES,
} from './file-submission-modal.utils';

export interface FileDropzoneProps {
  /** Callback when files are dropped */
  onDrop: (files: FileWithPath[]) => void;
  /** Whether uploads are in progress */
  isUploading: boolean;
  /** Submission type to determine accepted file types */
  type: SubmissionType;
}

/**
 * Convert clipboard items to FileWithPath array.
 */
async function getFilesFromClipboard(): Promise<FileWithPath[]> {
  try {
    const clipboardItems = await navigator.clipboard.read();
    const files: FileWithPath[] = [];

    for (const item of clipboardItems) {
      // Check for image types
      for (const mimeType of item.types) {
        if (mimeType.startsWith('image/')) {
          const blob = await item.getType(mimeType);
          // Generate a filename based on type and timestamp
          const extension = mimeType.split('/')[1] || 'png';
          const filename = `clipboard-${Date.now()}.${extension}`;
          const file = new File([blob], filename, { type: mimeType });
          // Add path property to match FileWithPath interface
          files.push(Object.assign(file, { path: filename }));
        }
      }
    }

    return files;
  } catch {
    // Clipboard API not available or permission denied
    return [];
  }
}

/**
 * File dropzone for selecting and dropping files.
 */
export function FileDropzone({ onDrop, isUploading, type }: FileDropzoneProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Determine accepted MIME types based on submission type
  const acceptedMimeTypes = useMemo(() => {
    if (type === SubmissionType.MESSAGE) {
      return [...IMAGE_MIME_TYPE];
    }
    return [
      ...IMAGE_MIME_TYPE,
      ...VIDEO_MIME_TYPES,
      ...TEXT_MIME_TYPES,
      ...PDF_MIME_TYPE,
      ...MS_WORD_MIME_TYPE,
    ];
  }, [type]);

  // Handle paste from clipboard button click
  const handlePasteFromClipboard = useCallback(async () => {
    if (isUploading) return;

    const files = await getFilesFromClipboard();
    if (files.length > 0) {
      onDrop(files);
    }
  }, [isUploading, onDrop]);

  // Listen for paste events on the document when modal is open
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      if (isUploading) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      const files: FileWithPath[] = [];

      for (const item of items) {
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) {
            // Check if the file type is accepted
            const isAccepted = acceptedMimeTypes.some(
              (mime) =>
                file.type === mime ||
                file.type.startsWith(mime.replace('/*', '/')),
            );
            if (isAccepted) {
              files.push(Object.assign(file, { path: file.name }));
            }
          }
        }
      }

      if (files.length > 0) {
        e.preventDefault();
        onDrop(files);
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [isUploading, acceptedMimeTypes, onDrop]);

  return (
    <Box
      ref={containerRef}
      p="md"
      pb={0}
      className="postybirb__file_submission_modal_dropzone_container"
    >
      <Dropzone
        onDrop={onDrop}
        accept={acceptedMimeTypes}
        loading={isUploading}
        disabled={isUploading}
        styles={{
          root: {
            borderStyle: 'solid',
            borderWidth: 1,
            backgroundColor: 'var(--mantine-color-default-hover)',
            borderRadius: '4px',
          },
        }}
      >
        <Group
          justify="center"
          gap="xl"
          mih={80}
          className="postybirb__file_submission_modal_dropzone_content"
        >
          <Dropzone.Accept>
            <IconUpload size={40} stroke={1.5} />
          </Dropzone.Accept>
          <Dropzone.Reject>
            <IconX size={40} stroke={1.5} />
          </Dropzone.Reject>
          <Dropzone.Idle>
            <IconPhoto size={40} stroke={1.5} />
          </Dropzone.Idle>

          <div>
            <Text size="lg" inline>
              <Trans>Drag files here or click to select</Trans>
            </Text>
            <Text size="sm" c="dimmed" inline mt={7}>
              <Trans>
                Attach as many files as you like, each file will become a
                separate submission
              </Trans>
            </Text>
          </div>
        </Group>
      </Dropzone>

      {/* Paste from clipboard button */}
      <Group justify="center" mt="xs" w="100%">
        <Tooltip label={<Trans>Paste image from clipboard (Ctrl+V)</Trans>}>
          <Button
            fullWidth
            variant="subtle"
            size="xs"
            leftSection={<IconClipboard size={14} />}
            onClick={handlePasteFromClipboard}
            disabled={isUploading}
          >
            <Trans>Paste from clipboard</Trans>
          </Button>
        </Tooltip>
      </Group>
    </Box>
  );
}
