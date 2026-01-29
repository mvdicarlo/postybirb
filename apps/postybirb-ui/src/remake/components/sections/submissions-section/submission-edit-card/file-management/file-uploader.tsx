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
import { FileType } from '@postybirb/types';
import { getFileType } from '@postybirb/utils/file-type';
import { IconPhoto, IconUpload, IconX } from '@tabler/icons-react';
import { useState } from 'react';
import fileSubmissionApi from '../../../../../api/file-submission.api';
import {
    showErrorNotification,
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

/**
 * Gets a human-readable label for a FileType.
 */
function getFileTypeLabel(fileType: FileType): string {
  switch (fileType) {
    case FileType.IMAGE:
      return 'image';
    case FileType.VIDEO:
      return 'video';
    case FileType.AUDIO:
      return 'audio';
    case FileType.TEXT:
      return 'text';
    default:
      return 'unknown';
  }
}

export function FileUploader() {
  const { submission } = useSubmissionEditCardContext();
  const [uploading, setUploading] = useState(false);

  // Get the existing file type if there are files
  const existingFileType =
    submission.files.length > 0
      ? getFileType(submission.files[0].fileName)
      : null;

  const handleDrop = async (files: FileWithPath[]) => {
    if (files.length === 0) return;

    // Check file type compatibility before uploading
    if (existingFileType) {
      const incompatibleFiles = files.filter(
        (file) => getFileType(file.name) !== existingFileType
      );

      if (incompatibleFiles.length > 0) {
        const newFileType = getFileType(incompatibleFiles[0].name);
        showErrorNotification(
          <Trans>
            Cannot add {getFileTypeLabel(newFileType)} files to a submission
            containing {getFileTypeLabel(existingFileType)} files. All files in
            a submission must be of the same type.
          </Trans>
        );
        return;
      }
    }

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
