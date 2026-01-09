/**
 * FileUploader - Dropzone for uploading additional files to submission.
 */

import { Trans } from '@lingui/react/macro';
import { Box, Group, Text, rem } from '@mantine/core';
import {
    Dropzone,
    FileWithPath,
    IMAGE_MIME_TYPE,
    MS_WORD_MIME_TYPE,
    PDF_MIME_TYPE,
} from '@mantine/dropzone';
import { IconPhoto, IconUpload, IconX } from '@tabler/icons-react';
import { useState } from 'react';
import fileSubmissionApi from '../../../../../api/file-submission.api';
import {
  showUploadErrorNotification,
  showWarningNotification,
} from '../../../../../utils/notifications';
import { useSubmissionEditCardContext } from '../context';

// Supported MIME types
const TEXT_MIME_TYPES = [
  'text/plain',
  'text/html',
  'application/json',
  'application/xml',
  'application/rtf',
  ...MS_WORD_MIME_TYPE,
  ...PDF_MIME_TYPE,
];

const VIDEO_MIME_TYPES = ['video/mp4', 'video/x-m4v', 'video/*'];
const AUDIO_MIME_TYPES = ['audio/*'];

const MAX_SIZE = 100 * 1024 * 1024; // 100MB

export function FileUploader() {
  const { submission } = useSubmissionEditCardContext();
  const [uploading, setUploading] = useState(false);

  const handleDrop = async (files: FileWithPath[]) => {
    if (files.length === 0) return;

    setUploading(true);
    try {
      await fileSubmissionApi.appendFiles(submission.id, 'file', files);
    } catch (error) {
      showUploadErrorNotification(
        error instanceof Error ? error.message : undefined
      );
    } finally {
      setUploading(false);
    }
  };

  const handleReject = () => {
    showWarningNotification(
      <Trans>Some files were rejected. Check file type and size (max 100MB).</Trans>
    );
  };

  return (
    <Dropzone
      onDrop={handleDrop}
      onReject={handleReject}
      maxSize={MAX_SIZE}
      accept={[
        ...IMAGE_MIME_TYPE,
        ...VIDEO_MIME_TYPES,
        ...AUDIO_MIME_TYPES,
        ...TEXT_MIME_TYPES,
      ]}
      loading={uploading}
      multiple
    >
      <Group
        justify="center"
        gap="xl"
        mih={80}
        style={{ pointerEvents: 'none' }}
      >
        <Dropzone.Accept>
          <IconUpload
            style={{
              width: rem(40),
              height: rem(40),
              color: 'var(--mantine-color-blue-6)',
            }}
            stroke={1.5}
          />
        </Dropzone.Accept>
        <Dropzone.Reject>
          <IconX
            style={{
              width: rem(40),
              height: rem(40),
              color: 'var(--mantine-color-red-6)',
            }}
            stroke={1.5}
          />
        </Dropzone.Reject>
        <Dropzone.Idle>
          <IconPhoto
            style={{
              width: rem(40),
              height: rem(40),
              color: 'var(--mantine-color-dimmed)',
            }}
            stroke={1.5}
          />
        </Dropzone.Idle>

        <Box>
          <Text size="sm" inline>
            <Trans>Drag files here or click to select</Trans>
          </Text>
          <Text size="xs" c="dimmed" inline mt={4}>
            <Trans>Images, videos, audio, and text files up to 100MB</Trans>
          </Text>
        </Box>
      </Group>
    </Dropzone>
  );
}
