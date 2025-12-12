/**
 * FileActions - Primary file and thumbnail management with replace/upload/crop actions.
 * Horizontal layout for compact display.
 */

import { Trans } from '@lingui/react/macro';
import {
    ActionIcon,
    Badge,
    Box,
    Divider,
    FileButton,
    Group,
    Image,
    Stack,
    Text,
    Tooltip,
} from '@mantine/core';
import { FileWithPath } from '@mantine/dropzone';
import { notifications } from '@mantine/notifications';
import { FileType, ISubmissionFileDto, SubmissionId } from '@postybirb/types';
import { getFileType } from '@postybirb/utils/file-type';
import { IconCrop, IconFileUpload, IconReplace } from '@tabler/icons-react';
import { useState } from 'react';
import fileSubmissionApi, {
    FileUpdateTarget,
} from '../../../../../api/file-submission.api';
import { defaultTargetProvider } from '../../../../../transports/http-client';
import { ImageEditor } from '../../file-submission-modal/image-editor';
import { FilePreview } from './file-preview';

interface FileActionsProps {
  file: ISubmissionFileDto;
  submissionId: SubmissionId;
}

/**
 * File actions panel with horizontal layout - primary file and thumbnail management.
 */
export function FileActions({ file, submissionId }: FileActionsProps) {
  const fileType = getFileType(file.fileName);

  // Editor modal states - stores the file to edit and which target to update
  const [editorFile, setEditorFile] = useState<FileWithPath | null>(null);
  const [editorTarget, setEditorTarget] = useState<FileUpdateTarget>('file');
  const [isLoadingPrimary, setIsLoadingPrimary] = useState(false);

  const handleReplaceFile = async (
    target: FileUpdateTarget,
    blob: Blob,
    filename?: string,
  ) => {
    try {
      await fileSubmissionApi.replaceFile(
        submissionId,
        file.id,
        target,
        blob,
        filename,
      );
    } catch (error) {
      notifications.show({
        message:
          // eslint-disable-next-line lingui/no-unlocalized-strings
          error instanceof Error ? error.message : 'Failed to replace file',
        color: 'red',
      });
    }
  };

  const handlePrimaryReplace = (payload: File | null) => {
    if (!payload) return;

    const newFileType = getFileType(payload.name);
    // Only allow replacing files with the same type
    if (fileType !== newFileType) {
      notifications.show({
        title: <Trans>Update Failed</Trans>,
        message: (
          <Trans>
            File types do not match. Please upload a file of the same type.
          </Trans>
        ),
        color: 'red',
      });
      return;
    }

    // For images, open editor modal first
    if (
      fileType === FileType.IMAGE &&
      (payload.type === 'image/png' || payload.type === 'image/jpeg')
    ) {
      setEditorTarget('file');
      setEditorFile(payload as FileWithPath);
    } else {
      handleReplaceFile('file', payload, payload.name);
    }
  };

  const handleThumbnailUpload = (payload: File | null) => {
    if (!payload) return;

    if (getFileType(payload.name) !== FileType.IMAGE) {
      notifications.show({
        message: <Trans>Thumbnail must be an image file.</Trans>,
        color: 'red',
      });
      return;
    }

    // Open editor for thumbnail
    setEditorTarget('thumbnail');
    setEditorFile(payload as FileWithPath);
  };

  const handleCropFromPrimary = async () => {
    // Fetch the primary file as blob and convert to File
    setIsLoadingPrimary(true);
    try {
      const response = await fetch(
        `${defaultTargetProvider()}/api/file/file/${file.id}?${file.hash}`,
      );
      const blob = await response.blob();
      const primaryFile = new File([blob], file.fileName, {
        type: file.mimeType,
      }) as FileWithPath;

      setEditorTarget('thumbnail');
      setEditorFile(primaryFile);
    } catch (error) {
      notifications.show({
        message: <Trans>Failed to load primary file for cropping.</Trans>,
        color: 'red',
      });
    } finally {
      setIsLoadingPrimary(false);
    }
  };

  const handleEditorClose = () => {
    setEditorFile(null);
  };

  const handleEditorApply = (originalFile: FileWithPath, editedBlob: Blob) => {
    handleReplaceFile(editorTarget, editedBlob, originalFile.name);
    setEditorFile(null);
  };

  return (
    <>
      {/* Image Editor Modal */}
      {editorFile && (
        <ImageEditor
          file={editorFile}
          opened={!!editorFile}
          onClose={handleEditorClose}
          onApply={handleEditorApply}
        />
      )}

      {/* Horizontal Layout */}
      <Group gap="sm" align="flex-start" wrap="nowrap">
        {/* Primary File Section */}
        <Stack gap={4} align="center">
          <Badge
            variant="filled"
            color="blue"
            radius="sm"
            size="xs"
            style={{ textTransform: 'none' }}
          >
            <Trans comment="Main file data">Primary</Trans>
          </Badge>

          <Box
            style={{
              borderRadius: 6,
              overflow: 'hidden',
              // eslint-disable-next-line lingui/no-unlocalized-strings
              border: '1px solid var(--mantine-color-dark-4)',
              background: 'var(--mantine-color-dark-7)',
              width: 80,
              height: 80,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FilePreview file={file} size={70} />
          </Box>

          <Group gap={4}>
            <FileButton onChange={handlePrimaryReplace}>
              {(buttonProps) => (
                <Tooltip label={<Trans>Replace file</Trans>} withArrow>
                  <ActionIcon
                    {...buttonProps}
                    variant="light"
                    color="blue"
                    size="xs"
                  >
                    <IconReplace size={12} />
                  </ActionIcon>
                </Tooltip>
              )}
            </FileButton>
          </Group>
        </Stack>

        <Divider orientation="vertical" />

        {/* Thumbnail Section */}
        <Stack gap={4} align="center">
          <Badge
            variant="outline"
            color="gray"
            radius="sm"
            size="xs"
            style={{ textTransform: 'none' }}
          >
            <Trans>Thumbnail</Trans>
          </Badge>

          <Box
            style={{
              borderRadius: 6,
              overflow: 'hidden',
              // eslint-disable-next-line lingui/no-unlocalized-strings
              border: '1px solid var(--mantine-color-dark-4)',
              background: 'var(--mantine-color-dark-7)',
              width: 80,
              height: 80,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ThumbnailDisplay file={file} />
          </Box>

          <Group gap={4}>
            {/* Crop from primary - only for images */}
            {fileType === FileType.IMAGE && (
              <Tooltip label={<Trans>Crop from primary</Trans>} withArrow>
                <ActionIcon
                  variant="light"
                  color="teal"
                  size="xs"
                  onClick={handleCropFromPrimary}
                  loading={isLoadingPrimary}
                >
                  <IconCrop size={12} />
                </ActionIcon>
              </Tooltip>
            )}

            {/* Upload custom thumbnail */}
            <FileButton accept="image/*" onChange={handleThumbnailUpload}>
              {(buttonProps) => (
                <Tooltip label={<Trans>Upload thumbnail</Trans>} withArrow>
                  <ActionIcon
                    {...buttonProps}
                    variant="light"
                    color="indigo"
                    size="xs"
                  >
                    <IconFileUpload size={12} />
                  </ActionIcon>
                </Tooltip>
              )}
            </FileButton>
          </Group>
        </Stack>
      </Group>
    </>
  );
}

/**
 * ThumbnailDisplay - Shows thumbnail or placeholder.
 */
function ThumbnailDisplay({ file }: { file: ISubmissionFileDto }) {
  if (!file.hasThumbnail) {
    return (
      <Text size="xs" c="dimmed" ta="center">
        <Trans>None</Trans>
      </Text>
    );
  }

  // Use thumbnail endpoint with cache-busting
  const src = `${defaultTargetProvider()}/api/file/thumbnail/${file.id}?${Date.now()}`;

  return (
    <Image
      radius={0}
      height={70}
      width={70}
      fit="contain"
      loading="lazy"
      alt={file.fileName}
      src={src}
    />
  );
}
