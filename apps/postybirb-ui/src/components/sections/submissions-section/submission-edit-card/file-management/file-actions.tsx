/**
 * FileActions - Primary file and thumbnail management with replace/upload/crop actions.
 * Horizontal layout for compact display.
 */

import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import {
    ActionIcon,
    Box,
    FileButton,
    Group,
    Image,
    Stack,
    Text,
    Tooltip,
} from '@mantine/core';
import { FileWithPath } from '@mantine/dropzone';
import { FileType, ISubmissionFileDto, SubmissionId } from '@postybirb/types';
import { getFileType } from '@postybirb/utils/file-type';
import {
    IconCrop,
    IconFileUpload,
    IconPencil,
    IconReplace,
} from '@tabler/icons-react';
import { useState } from 'react';
import fileSubmissionApi, {
    FileUpdateTarget,
} from '../../../../../api/file-submission.api';
import { getBaseUrl } from '../../../../../transports/http-client';
import {
    showErrorNotification,
    showErrorWithContext,
    showErrorWithTitleNotification,
} from '../../../../../utils/notifications';
import { ImageEditor } from '../../file-submission-modal/image-editor';
import { useSubmissionEditCardContext } from '../context';
import { FilePreview } from './file-preview';

interface FileActionsProps {
  file: ISubmissionFileDto;
  submissionId: SubmissionId;
}

/**
 * File actions panel with horizontal layout - primary file and thumbnail management.
 */
export function FileActions({ file, submissionId }: FileActionsProps) {
  const { submission } = useSubmissionEditCardContext();
  const fileType = getFileType(file.fileName);
  const { isArchived } = submission;

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
      showErrorWithContext(error, <Trans>Failed to replace file</Trans>);
    }
  };

  const handlePrimaryReplace = (payload: File | null) => {
    if (!payload) return;

    const newFileType = getFileType(payload.name);
    // Only allow replacing files with the same type
    if (fileType !== newFileType) {
      showErrorWithTitleNotification(
        <Trans>Update Failed</Trans>,
        <Trans>
          File types do not match. Please upload a file of the same type.
        </Trans>,
      );
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
      showErrorNotification(<Trans>Thumbnail must be an image file.</Trans>);
      return;
    }

    // Open editor for thumbnail
    setEditorTarget('thumbnail');
    setEditorFile(payload as FileWithPath);
  };

  const fetchPrimaryAsFile = async (): Promise<FileWithPath> => {
    const response = await fetch(
      `${getBaseUrl()}/api/file/file/${file.id}?${file.hash}`,
    );
    const blob = await response.blob();
    return new File([blob], file.fileName, {
      type: file.mimeType,
    }) as FileWithPath;
  };

  const handleEditPrimary = async () => {
    setIsLoadingPrimary(true);
    try {
      const primaryFile = await fetchPrimaryAsFile();
      setEditorTarget('file');
      setEditorFile(primaryFile);
    } catch {
      showErrorNotification(<Trans>Failed to load file for editing.</Trans>);
    } finally {
      setIsLoadingPrimary(false);
    }
  };

  const handleCropFromPrimary = async () => {
    // Fetch the primary file as blob and convert to File
    setIsLoadingPrimary(true);
    try {
      const primaryFile = await fetchPrimaryAsFile();
      setEditorTarget('thumbnail');
      setEditorFile(primaryFile);
    } catch {
      showErrorNotification(
        <Trans>Failed to load primary file for cropping.</Trans>,
      );
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

      <div className="postybirb-file-previews">
        <Stack gap="xs">
          <Text size="sm" fw={500}>
            <Trans>Primary</Trans>
          </Text>

          <Box className="postybirb-file-preview-frame">
            <FilePreview file={file} size={180} />
          </Box>

          <Group gap="xs">
            {/* Edit primary - only for editable images */}
            {fileType === FileType.IMAGE &&
              (file.mimeType === 'image/png' ||
                file.mimeType === 'image/jpeg') && (
                <Tooltip label={<Trans>Edit file</Trans>} withArrow>
                  <ActionIcon
                    disabled={isArchived}
                    variant="light"
                    color="grape"
                    size="md"
                    aria-label={t`Edit file`}
                    onClick={handleEditPrimary}
                    loading={isLoadingPrimary}
                  >
                    <IconPencil size={16} />
                  </ActionIcon>
                </Tooltip>
              )}

            <FileButton onChange={handlePrimaryReplace} disabled={isArchived}>
              {(buttonProps) => (
                <Tooltip label={<Trans>Replace file</Trans>} withArrow>
                  <ActionIcon
                    {...buttonProps}
                    variant="light"
                    color="blue"
                    size="md"
                    aria-label={t`Replace file`}
                    disabled={isArchived}
                  >
                    <IconReplace size={16} />
                  </ActionIcon>
                </Tooltip>
              )}
            </FileButton>
          </Group>
        </Stack>

        {/* Thumbnail Section */}
        <Stack gap="xs">
          <Text size="sm" fw={500}>
            <Trans>Thumbnail</Trans>
          </Text>

          <Box className="postybirb-file-preview-frame postybirb-file-thumbnail-frame">
            <ThumbnailDisplay file={file} />
          </Box>

          <Group gap="xs">
            {/* Crop from primary - only for images */}
            {fileType === FileType.IMAGE && (
              <Tooltip label={<Trans>Crop from primary</Trans>} withArrow>
                <ActionIcon
                  variant="light"
                  color="teal"
                  size="md"
                  aria-label={t`Crop from primary`}
                  disabled={isArchived}
                  onClick={handleCropFromPrimary}
                  loading={isLoadingPrimary}
                >
                  <IconCrop size={16} />
                </ActionIcon>
              </Tooltip>
            )}

            {/* Upload custom thumbnail */}
            <FileButton
              accept="image/*"
              onChange={handleThumbnailUpload}
              disabled={isArchived}
            >
              {(buttonProps) => (
                <Tooltip label={<Trans>Upload thumbnail</Trans>} withArrow>
                  <ActionIcon
                    {...buttonProps}
                    variant="light"
                    color="indigo"
                    size="md"
                    aria-label={t`Upload thumbnail`}
                    disabled={isArchived}
                  >
                    <IconFileUpload size={16} />
                  </ActionIcon>
                </Tooltip>
              )}
            </FileButton>
          </Group>
        </Stack>
      </div>
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

  // Use file hash for cache-busting — stable across renders, changes when content updates
  const src = `${getBaseUrl()}/api/file/thumbnail/${file.id}?${file.hash}`;

  return (
    <Image
      radius={0}
      h={96}
      w={96}
      fit="contain"
      loading="lazy"
      alt={file.fileName}
      src={src}
    />
  );
}
