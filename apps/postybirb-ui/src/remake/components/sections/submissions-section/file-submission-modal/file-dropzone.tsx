/**
 * FileDropzone - Dropzone component for file uploads.
 */

import { Trans } from '@lingui/react/macro';
import { Box, Group, Text } from '@mantine/core';
import {
    Dropzone,
    FileWithPath,
    IMAGE_MIME_TYPE,
    MS_WORD_MIME_TYPE,
    PDF_MIME_TYPE,
} from '@mantine/dropzone';
import { SubmissionType } from '@postybirb/types';
import { IconPhoto, IconUpload, IconX } from '@tabler/icons-react';
import { useMemo } from 'react';
import './file-submission-modal.css';
import { TEXT_MIME_TYPES, VIDEO_MIME_TYPES } from './file-submission-modal.utils';

export interface FileDropzoneProps {
  /** Callback when files are dropped */
  onDrop: (files: FileWithPath[]) => void;
  /** Whether uploads are in progress */
  isUploading: boolean;
  /** Submission type to determine accepted file types */
  type: SubmissionType;
}

/**
 * File dropzone for selecting and dropping files.
 */
export function FileDropzone({ onDrop, isUploading, type }: FileDropzoneProps) {
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

  return (
    <Box p="md" pb={0} className="postybirb__file_submission_modal_dropzone_container">
      <Dropzone
        onDrop={onDrop}
        accept={acceptedMimeTypes}
        loading={isUploading}
        disabled={isUploading}
        styles={{
          root: {
            borderStyle: 'dashed',
            borderWidth: 2,
            backgroundColor: 'var(--mantine-color-default-hover)',
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
    </Box>
  );
}
